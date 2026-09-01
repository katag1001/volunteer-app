const Task = require('../models/Task.js')
const TaskLink = require('../models/TaskLink.js')
const Issue = require('../models/Issue.js')
const AuthUser = require('../models/AuthUser.js')
const { isProjectMember } = require('../utils/isProjectMember.js')
const { recalculateIssueStatus } = require('../utils/statusEngine.js')

function isValidUrl(value) {
  try {
    // eslint-disable-next-line no-new
    new URL(value)
    return true
  } catch {
    return false
  }
}

function personRef(id, userById) {
  if (!id) return null
  const user = userById.get(id.toString())
  return { id, first_name: user?.first_name ?? 'Deleted user', last_name: user?.last_name ?? '' }
}

// GET /issues/:issueId/tasks
// prd.md §4.5 — self-serve/open to view, same as issues/projects.
async function listTasks(req, res) {
  try {
    const tasks = await Task.find({ issue_id: req.params.issueId }).sort({ created_at: 1 })
    const taskIds = tasks.map((t) => t._id)

    const links = await TaskLink.find({ task_id: { $in: taskIds } })
    const linksByTask = new Map()
    for (const link of links) {
      const key = link.task_id.toString()
      if (!linksByTask.has(key)) linksByTask.set(key, [])
      linksByTask.get(key).push({ id: link._id, title: link.title, url: link.url })
    }

    const userIds = [...new Set(tasks.flatMap((t) => [t.assigned_to, t.resolved_by]).filter(Boolean))]
    const users = await AuthUser.find({ _id: { $in: userIds } })
    const userById = new Map(users.map((u) => [u._id.toString(), u]))

    res.json({
      tasks: tasks.map((t) => ({
        id: t._id,
        name: t.name,
        description: t.description,
        status: t.status,
        assigned_to: personRef(t.assigned_to, userById),
        resolution: t.resolution,
        resolved_at: t.resolved_at,
        resolved_by: personRef(t.resolved_by, userById),
        links: linksByTask.get(t._id.toString()) || [],
      })),
    })
  } catch {
    res.status(500).json({ error: 'failed_to_list_tasks' })
  }
}

// POST /issues/:issueId/tasks { name, description, assigned_to }
// prd.md §4.5 — any project member; assignee (if any) must be a current
// project member, but does NOT need to already be an IssueMember.
async function createTask(req, res) {
  const { name, description, assigned_to } = req.body || {}
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name_required' })
  }

  try {
    const issue = await Issue.findById(req.params.issueId)
    if (!issue) return res.status(404).json({ error: 'issue_not_found' })
    if (!(await isProjectMember(issue.project_id, req.user._id))) {
      return res.status(403).json({ error: 'must_be_project_member' })
    }
    if (assigned_to && !(await isProjectMember(issue.project_id, assigned_to))) {
      return res.status(400).json({ error: 'assignee_not_project_member' })
    }

    const task = await Task.create({
      issue_id: issue._id,
      name: name.trim(),
      description: description || '',
      assigned_to: assigned_to || null,
      created_by: req.user._id,
    })
    await recalculateIssueStatus(issue._id)

    res.status(201).json({ task: { id: task._id, name: task.name, status: task.status } })
  } catch {
    res.status(500).json({ error: 'create_failed' })
  }
}

// PATCH /tasks/:id/assign { assigned_to }
// prd.md §4.5 — reassignable to any current project member at any time
// before it's resolved; null clears the assignment.
async function assignTask(req, res) {
  const { assigned_to } = req.body || {}
  try {
    const task = await Task.findById(req.params.id)
    if (!task) return res.status(404).json({ error: 'not_found' })
    if (task.status === 'resolved') return res.status(400).json({ error: 'already_resolved' })

    const issue = await Issue.findById(task.issue_id)
    if (!(await isProjectMember(issue.project_id, req.user._id))) {
      return res.status(403).json({ error: 'must_be_project_member' })
    }
    if (assigned_to && !(await isProjectMember(issue.project_id, assigned_to))) {
      return res.status(400).json({ error: 'assignee_not_project_member' })
    }

    task.assigned_to = assigned_to || null
    task.updated_at = new Date()
    await task.save()
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'assign_failed' })
  }
}

// PATCH /tasks/:id/status { status: 'not_started' | 'underway' }
// Resolving goes through the dedicated resolve endpoint below, not this
// one — resolution is a one-way door with a mandatory note, not a status flip.
async function setTaskStatus(req, res) {
  const { status } = req.body || {}
  if (!['not_started', 'underway'].includes(status)) {
    return res.status(400).json({ error: 'invalid_status' })
  }

  try {
    const task = await Task.findById(req.params.id)
    if (!task) return res.status(404).json({ error: 'not_found' })
    if (task.status === 'resolved') return res.status(400).json({ error: 'already_resolved' })

    const issue = await Issue.findById(task.issue_id)
    if (!(await isProjectMember(issue.project_id, req.user._id))) {
      return res.status(403).json({ error: 'must_be_project_member' })
    }

    task.status = status
    task.updated_at = new Date()
    await task.save()
    await recalculateIssueStatus(issue._id)
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'status_update_failed' })
  }
}

// POST /tasks/:id/resolve { resolution }
// prd.md §4.5 — mandatory resolution note, sets status/resolution/
// resolved_by/resolved_at together, immutable afterward (no edit/reopen in
// v1). Cascades the parent issue's (and in turn its project's) status.
async function resolveTask(req, res) {
  const { resolution } = req.body || {}
  if (!resolution || !resolution.trim()) {
    return res.status(400).json({ error: 'resolution_required' })
  }

  try {
    const task = await Task.findById(req.params.id)
    if (!task) return res.status(404).json({ error: 'not_found' })
    if (task.status === 'resolved') return res.status(400).json({ error: 'already_resolved' })

    const issue = await Issue.findById(task.issue_id)
    if (!(await isProjectMember(issue.project_id, req.user._id))) {
      return res.status(403).json({ error: 'must_be_project_member' })
    }

    task.status = 'resolved'
    task.resolution = resolution.trim()
    task.resolved_by = req.user._id
    task.resolved_at = new Date()
    task.updated_at = new Date()
    await task.save()
    await recalculateIssueStatus(issue._id)

    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'resolve_failed' })
  }
}

// POST /tasks/:id/links { title, url }
async function addTaskLink(req, res) {
  const { title, url } = req.body || {}
  if (!title || !title.trim()) return res.status(400).json({ error: 'title_required' })
  if (!url || !isValidUrl(url)) return res.status(400).json({ error: 'invalid_url' })

  try {
    const task = await Task.findById(req.params.id)
    if (!task) return res.status(404).json({ error: 'not_found' })
    const issue = await Issue.findById(task.issue_id)
    if (!(await isProjectMember(issue.project_id, req.user._id))) {
      return res.status(403).json({ error: 'must_be_project_member' })
    }

    const link = await TaskLink.create({
      task_id: task._id,
      title: title.trim(),
      url: url.trim(),
      created_by: req.user._id,
    })
    res.status(201).json({ link: { id: link._id, title: link.title, url: link.url } })
  } catch {
    res.status(500).json({ error: 'add_link_failed' })
  }
}

module.exports = { listTasks, createTask, assignTask, setTaskStatus, resolveTask, addTaskLink }

const Issue = require('../models/Issue.js')
const IssueMember = require('../models/IssueMember.js')
const Task = require('../models/Task.js')
const AuthUser = require('../models/AuthUser.js')
const { isProjectMember } = require('../utils/isProjectMember.js')
const { recalculateProjectStatus } = require('../utils/statusEngine.js')

// GET /projects/:projectId/issues
// prd.md §4.4 — collapsed cards need status, "x of y tasks" done, and
// people count. Viewing is self-serve/open like projects — any active
// member, not only current project members.
async function listIssues(req, res) {
  try {
    const issues = await Issue.find({ project_id: req.params.projectId }).sort({ created_at: 1 })
    const issueIds = issues.map((issue) => issue._id)

    const tasks = await Task.find({ issue_id: { $in: issueIds } }, 'issue_id status')
    const taskStatsByIssue = new Map()
    for (const task of tasks) {
      const key = task.issue_id.toString()
      const stats = taskStatsByIssue.get(key) || { total: 0, resolved: 0 }
      stats.total += 1
      if (task.status === 'resolved') stats.resolved += 1
      taskStatsByIssue.set(key, stats)
    }

    const memberCounts = await IssueMember.aggregate([
      { $match: { issue_id: { $in: issueIds } } },
      { $group: { _id: '$issue_id', count: { $sum: 1 } } },
    ])
    const memberCountByIssue = new Map(memberCounts.map((m) => [m._id.toString(), m.count]))

    res.json({
      issues: issues.map((issue) => {
        const stats = taskStatsByIssue.get(issue._id.toString()) || { total: 0, resolved: 0 }
        return {
          id: issue._id,
          title: issue.title,
          status: issue.status,
          task_total: stats.total,
          task_resolved: stats.resolved,
          people_count: memberCountByIssue.get(issue._id.toString()) || 0,
        }
      }),
    })
  } catch {
    res.status(500).json({ error: 'failed_to_list_issues' })
  }
}

// POST /projects/:projectId/issues { title, description }
// prd.md §4.4 — any project member; creator is auto-added as an
// IssueMember. A fresh issue moves the project from not_started to
// underway (prd.md §4.2), so the project status is recalculated.
async function createIssue(req, res) {
  const { title, description } = req.body || {}
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'title_required' })
  }

  try {
    if (!(await isProjectMember(req.params.projectId, req.user._id))) {
      return res.status(403).json({ error: 'must_be_member' })
    }

    const issue = await Issue.create({
      project_id: req.params.projectId,
      title: title.trim(),
      description: description || '',
      created_by: req.user._id,
    })
    await IssueMember.create({ issue_id: issue._id, user_id: req.user._id })
    await recalculateProjectStatus(req.params.projectId)

    res.status(201).json({ issue: { id: issue._id, title: issue.title, status: issue.status } })
  } catch {
    res.status(500).json({ error: 'create_failed' })
  }
}

// GET /issues/:id
// prd.md §4.4 — the expanded view: description + people involved. Tasks
// and polls are only counted here, not listed — their actual UI is Phase
// B4/B5's job.
async function getIssue(req, res) {
  try {
    const issue = await Issue.findById(req.params.id)
    if (!issue) return res.status(404).json({ error: 'not_found' })

    const members = await IssueMember.find({ issue_id: issue._id })
    const users = await AuthUser.find({ _id: { $in: members.map((m) => m.user_id) } })
    const userById = new Map(users.map((u) => [u._id.toString(), u]))

    const tasks = await Task.find({ issue_id: issue._id }, 'status')

    res.json({
      issue: {
        id: issue._id,
        project_id: issue.project_id,
        title: issue.title,
        description: issue.description,
        status: issue.status,
        created_at: issue.created_at,
        task_total: tasks.length,
        task_resolved: tasks.filter((t) => t.status === 'resolved').length,
        members: members.map((m) => {
          const user = userById.get(m.user_id.toString())
          return {
            id: m.user_id,
            first_name: user?.first_name ?? 'Deleted user',
            last_name: user?.last_name ?? '',
          }
        }),
        is_member: members.some((m) => m.user_id.equals(req.user._id)),
      },
    })
  } catch {
    res.status(500).json({ error: 'failed_to_load_issue' })
  }
}

// POST /issues/:id/members { user_id }
// prd.md §4.4/§4.7 — any current project member can add themselves or
// anyone else, as long as the target is already a project member (issue
// membership is a subset of project membership, never automatic).
async function addIssueMember(req, res) {
  const { user_id } = req.body || {}
  try {
    const issue = await Issue.findById(req.params.id)
    if (!issue) return res.status(404).json({ error: 'not_found' })
    if (!(await isProjectMember(issue.project_id, req.user._id))) {
      return res.status(403).json({ error: 'must_be_project_member' })
    }
    if (!user_id || !(await isProjectMember(issue.project_id, user_id))) {
      return res.status(400).json({ error: 'target_not_project_member' })
    }

    try {
      await IssueMember.create({ issue_id: issue._id, user_id })
    } catch (error) {
      if (error.code !== 11000) throw error // already a member — idempotent
    }
    res.status(201).json({ ok: true })
  } catch {
    res.status(500).json({ error: 'add_member_failed' })
  }
}

// DELETE /issues/:id/members/:userId — same flat permission, per prd.md §4.7.
async function removeIssueMember(req, res) {
  try {
    const issue = await Issue.findById(req.params.id)
    if (!issue) return res.status(404).json({ error: 'not_found' })
    if (!(await isProjectMember(issue.project_id, req.user._id))) {
      return res.status(403).json({ error: 'must_be_project_member' })
    }
    await IssueMember.deleteOne({ issue_id: issue._id, user_id: req.params.userId })
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'remove_member_failed' })
  }
}

module.exports = { listIssues, createIssue, getIssue, addIssueMember, removeIssueMember }

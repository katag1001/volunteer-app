const Project = require('../models/Project.js')
const ProjectMember = require('../models/ProjectMember.js')
const ProjectTeam = require('../models/ProjectTeam.js')
const Issue = require('../models/Issue.js')
const Task = require('../models/Task.js')
const AuthUser = require('../models/AuthUser.js')
const { isProjectMember } = require('../utils/isProjectMember.js')
const { leaveProject: leaveProjectUtil } = require('../utils/leaveProject.js')
const { deleteProjectCascade } = require('../utils/deleteProject.js')
const { getMasterTeamList } = require('../utils/skillTeams.js')

const DELETE_CONFIRM_PHRASE = 'delete project'

// GET /projects
// prd.md §4.3 — every project in the org, self-serve/open (not gated on
// membership). Card counts include issues/tasks even though nothing can
// create them yet (Phase B3/B4) — they'll correctly show 0 until then.
async function listProjects(req, res) {
  try {
    const projects = await Project.find({}).sort({ created_at: -1 })
    const projectIds = projects.map((p) => p._id)

    const memberCounts = await ProjectMember.aggregate([
      { $match: { project_id: { $in: projectIds } } },
      { $group: { _id: '$project_id', count: { $sum: 1 } } },
    ])
    const memberCountByProject = new Map(memberCounts.map((m) => [m._id.toString(), m.count]))

    const issues = await Issue.find({ project_id: { $in: projectIds } }, '_id project_id')
    const issueCountByProject = new Map()
    const projectByIssue = new Map()
    for (const issue of issues) {
      const key = issue.project_id.toString()
      issueCountByProject.set(key, (issueCountByProject.get(key) || 0) + 1)
      projectByIssue.set(issue._id.toString(), key)
    }

    const tasks = await Task.find({ issue_id: { $in: issues.map((i) => i._id) } }, 'issue_id')
    const taskCountByProject = new Map()
    for (const task of tasks) {
      const projectKey = projectByIssue.get(task.issue_id.toString())
      if (projectKey) taskCountByProject.set(projectKey, (taskCountByProject.get(projectKey) || 0) + 1)
    }

    res.json({
      projects: projects.map((p) => ({
        id: p._id,
        title: p.title,
        description: p.description,
        status: p.status,
        created_at: p.created_at,
        member_count: memberCountByProject.get(p._id.toString()) || 0,
        issue_count: issueCountByProject.get(p._id.toString()) || 0,
        task_count: taskCountByProject.get(p._id.toString()) || 0,
      })),
    })
  } catch {
    res.status(500).json({ error: 'failed_to_list_projects' })
  }
}

// POST /projects { title, description }
// prd.md §4.3 — any approved member can create one; the creator becomes a
// ProjectMember with role 'contact' by default.
async function createProject(req, res) {
  const { title, description } = req.body || {}
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'title_required' })
  }

  try {
    const project = await Project.create({
      title: title.trim(),
      description: description || '',
      created_by: req.user._id,
    })
    await ProjectMember.create({ project_id: project._id, user_id: req.user._id, role: 'contact' })
    res.status(201).json({ project: { id: project._id, title: project.title, status: project.status } })
  } catch {
    res.status(500).json({ error: 'create_failed' })
  }
}

// GET /projects/:id
// prd.md §4.3 — full detail header: title, description, contact, member
// count/list, team tags. Self-serve/open, so viewing doesn't require
// already being a member.
async function getProject(req, res) {
  try {
    const project = await Project.findById(req.params.id)
    if (!project) return res.status(404).json({ error: 'not_found' })

    const members = await ProjectMember.find({ project_id: project._id })
    const memberUsers = await AuthUser.find({ _id: { $in: members.map((m) => m.user_id) } })
    const userById = new Map(memberUsers.map((u) => [u._id.toString(), u]))
    const contactMembership = members.find((m) => m.role === 'contact')
    const contactUser = contactMembership && userById.get(contactMembership.user_id.toString())

    const teamTags = await ProjectTeam.find({ project_id: project._id })

    res.json({
      project: {
        id: project._id,
        title: project.title,
        description: project.description,
        status: project.status,
        created_at: project.created_at,
        contact: contactUser
          ? { id: contactUser._id, first_name: contactUser.first_name, last_name: contactUser.last_name }
          : null,
        teams: teamTags.map((t) => t.team),
        members: members.map((m) => {
          const user = userById.get(m.user_id.toString())
          return {
            id: m.user_id,
            first_name: user?.first_name ?? 'Deleted user',
            last_name: user?.last_name ?? '',
            role: m.role,
          }
        }),
        is_member: members.some((m) => m.user_id.equals(req.user._id)),
      },
    })
  } catch {
    res.status(500).json({ error: 'failed_to_load_project' })
  }
}

// POST /projects/:id/join — prd.md §4.3, entirely self-service.
async function joinProject(req, res) {
  try {
    const project = await Project.findById(req.params.id)
    if (!project) return res.status(404).json({ error: 'not_found' })

    await ProjectMember.create({ project_id: project._id, user_id: req.user._id, role: 'member' })
    res.status(201).json({ ok: true })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'already_member' })
    }
    res.status(500).json({ error: 'join_failed' })
  }
}

// POST /projects/:id/leave — prd.md §4.3, gated client-side by an "are you
// sure" confirm (no server-side confirmation text required, unlike delete).
async function leaveProject(req, res) {
  try {
    const alreadyMember = await isProjectMember(req.params.id, req.user._id)
    if (!alreadyMember) return res.status(400).json({ error: 'not_a_member' })

    await leaveProjectUtil(req.params.id, req.user._id)
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'leave_failed' })
  }
}

// POST /projects/:id/teams { team } — prd.md §4.3, any current project member.
async function addTeamTag(req, res) {
  const { team } = req.body || {}
  try {
    if (!(await isProjectMember(req.params.id, req.user._id))) {
      return res.status(403).json({ error: 'must_be_member' })
    }
    if (!team || !getMasterTeamList().includes(team)) {
      return res.status(400).json({ error: 'invalid_team' })
    }

    try {
      await ProjectTeam.create({ project_id: req.params.id, team })
    } catch (error) {
      if (error.code !== 11000) throw error // already tagged — treat as success, idempotent
    }
    res.status(201).json({ ok: true })
  } catch {
    res.status(500).json({ error: 'add_team_failed' })
  }
}

// DELETE /projects/:id/teams { team } — any current project member.
async function removeTeamTag(req, res) {
  const { team } = req.body || {}
  try {
    if (!(await isProjectMember(req.params.id, req.user._id))) {
      return res.status(403).json({ error: 'must_be_member' })
    }
    await ProjectTeam.deleteOne({ project_id: req.params.id, team })
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'remove_team_failed' })
  }
}

// PATCH /projects/:id/contact { user_id | null }
// prd.md §4.3 — purely a display label, no permissions attached. Any
// current project member can reassign it to any other current member, to
// themselves, or clear it entirely.
async function setContact(req, res) {
  const { user_id } = req.body || {}
  try {
    if (!(await isProjectMember(req.params.id, req.user._id))) {
      return res.status(403).json({ error: 'must_be_member' })
    }

    if (user_id) {
      const targetIsMember = await isProjectMember(req.params.id, user_id)
      if (!targetIsMember) return res.status(400).json({ error: 'not_a_member' })
    }

    await ProjectMember.updateMany({ project_id: req.params.id, role: 'contact' }, { role: 'member' })
    if (user_id) {
      await ProjectMember.updateOne({ project_id: req.params.id, user_id }, { role: 'contact' })
    }
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'set_contact_failed' })
  }
}

// DELETE /projects/:id { confirmText }
// prd.md §4.3 — any current project member, only once resolved, gated by
// typing the exact phrase "delete project".
async function deleteProject(req, res) {
  const { confirmText } = req.body || {}
  try {
    if (!(await isProjectMember(req.params.id, req.user._id))) {
      return res.status(403).json({ error: 'must_be_member' })
    }

    const project = await Project.findById(req.params.id)
    if (!project) return res.status(404).json({ error: 'not_found' })
    if (project.status !== 'resolved') {
      return res.status(400).json({ error: 'not_resolved' })
    }
    if (confirmText !== DELETE_CONFIRM_PHRASE) {
      return res.status(400).json({ error: 'confirmation_mismatch' })
    }

    await deleteProjectCascade(project._id)
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'delete_failed' })
  }
}

module.exports = {
  listProjects,
  createProject,
  getProject,
  joinProject,
  leaveProject,
  addTeamTag,
  removeTeamTag,
  setContact,
  deleteProject,
}

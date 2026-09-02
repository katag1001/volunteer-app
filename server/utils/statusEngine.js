const Project = require('../models/Project.js')
const Issue = require('../models/Issue.js')
const Task = require('../models/Task.js')
const Poll = require('../models/Poll.js')

// prd.md §4.2 — pure calculation, matching the pseudocode exactly. Every
// recalculation reads the children fresh rather than tracking state
// incrementally, so "reopening" (a new task added to a Resolved issue, etc.)
// falls out naturally: it's just the same calculation run again.

function calculateIssueStatus({ taskStatuses, pollCount }) {
  if (taskStatuses.length === 0 && pollCount === 0) return 'not_started'
  if (taskStatuses.length > 0 && taskStatuses.every((status) => status === 'resolved')) return 'resolved'
  return 'underway'
}

function calculateProjectStatus({ issueStatuses }) {
  if (issueStatuses.length === 0) return 'not_started'
  if (issueStatuses.every((status) => status === 'resolved')) return 'resolved'
  return 'underway'
}

// Recomputes and persists one issue's status from its current tasks/polls,
// then cascades up to recompute its project. Callers (Phase B3+) should
// call this after: a task's status changes, or a task/poll is added to or
// removed from an issue.
async function recalculateIssueStatus(issueId) {
  const issue = await Issue.findById(issueId)
  if (!issue) return null

  const tasks = await Task.find({ issue_id: issueId })
  const pollCount = await Poll.countDocuments({ issue_id: issueId })
  const newStatus = calculateIssueStatus({ taskStatuses: tasks.map((task) => task.status), pollCount })

  if (issue.status !== newStatus) {
    issue.status = newStatus
    issue.updated_at = new Date()
    await issue.save()
  }

  await recalculateProjectStatus(issue.project_id)
  return newStatus
}

// Recomputes and persists one project's status from its current issues.
// Call directly after an issue is added to or removed from a project;
// recalculateIssueStatus already calls this itself, so callers reacting to
// a task/poll change only need to call recalculateIssueStatus.
async function recalculateProjectStatus(projectId) {
  const project = await Project.findById(projectId)
  if (!project) return null

  const issues = await Issue.find({ project_id: projectId })
  const newStatus = calculateProjectStatus({ issueStatuses: issues.map((issue) => issue.status) })

  if (project.status !== newStatus) {
    project.status = newStatus
    project.updated_at = new Date()
    await project.save()
  }

  return newStatus
}

module.exports = {
  calculateIssueStatus,
  calculateProjectStatus,
  recalculateIssueStatus,
  recalculateProjectStatus,
}

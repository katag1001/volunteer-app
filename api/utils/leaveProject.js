const ProjectMember = require('../models/ProjectMember.js')
const IssueMember = require('../models/IssueMember.js')
const Issue = require('../models/Issue.js')
const Task = require('../models/Task.js')

// prd.md §4.3 — leaving a project is entirely self-service. On leaving:
// - Their ProjectMember row is removed (this also silently clears the
//   `contact` tag if they held it — no succession logic needed, per PRD).
// - Their IssueMember rows within this project's issues are removed.
// - Any tasks in this project assigned to them are set back to unassigned.
// - Their created_by attribution on anything they made is left untouched.
async function leaveProject(projectId, userId) {
  await ProjectMember.deleteOne({ project_id: projectId, user_id: userId })

  const issues = await Issue.find({ project_id: projectId }, '_id')
  const issueIds = issues.map((issue) => issue._id)
  await IssueMember.deleteMany({ issue_id: { $in: issueIds }, user_id: userId })
  await Task.updateMany({ issue_id: { $in: issueIds }, assigned_to: userId }, { assigned_to: null })
}

module.exports = { leaveProject }

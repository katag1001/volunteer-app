const ProjectMember = require('../models/ProjectMember.js')

// prd.md §4.7 — most Section B actions are gated on "any current project
// member," not any approved org member. Used across projectController for
// every action that needs that narrower check.
async function isProjectMember(projectId, userId) {
  const membership = await ProjectMember.findOne({ project_id: projectId, user_id: userId })
  return !!membership
}

module.exports = { isProjectMember }

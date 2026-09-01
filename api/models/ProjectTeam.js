const mongoose = require('mongoose')
const Schema = mongoose.Schema

// prd.md §4.1. `team` is validated against the master team list (derived
// from config/skillTeams.json, see api/utils/skillTeams.js) at the API
// layer by the future team-tagging controller (Phase B2), not here — same
// pattern as UserProfile.teams.
const ProjectTeamSchema = new Schema({
  project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  team: { type: String, required: true },
})

ProjectTeamSchema.index({ project_id: 1, team: 1 }, { unique: true })

const ProjectTeam = mongoose.model('ProjectTeam', ProjectTeamSchema)
module.exports = ProjectTeam

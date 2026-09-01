const mongoose = require('mongoose')
const Schema = mongoose.Schema

// prd.md §4.1. role is a display label only — "contact" carries no
// permissions (prd.md §4.3). At most one contact per project is enforced by
// the future project-lifecycle controller (Phase B2), not at the schema level.
const ProjectMemberSchema = new Schema({
  project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  user_id: { type: Schema.Types.ObjectId, ref: 'AuthUser', required: true },
  role: { type: String, enum: ['contact', 'member'], default: 'member' },
  joined_at: { type: Date, default: Date.now },
})

ProjectMemberSchema.index({ project_id: 1, user_id: 1 }, { unique: true })

const ProjectMember = mongoose.model('ProjectMember', ProjectMemberSchema)
module.exports = ProjectMember

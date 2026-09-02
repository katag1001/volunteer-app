const mongoose = require('mongoose')
const Schema = mongoose.Schema

// prd.md §4.1. Created ahead of its own build-plan phase (B3, which owns
// the add-issue flow/routes) because api/utils/statusEngine.js needs a real
// queryable collection to compute against — see mapping.md's Phase B1 note.
// status is derived, never set directly — only recalculateIssueStatus()
// writes it.
const IssueSchema = new Schema({
  project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  created_by: { type: Schema.Types.ObjectId, ref: 'AuthUser', required: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  status: { type: String, enum: ['not_started', 'underway', 'resolved'], default: 'not_started' },
})

const Issue = mongoose.model('Issue', IssueSchema)
module.exports = Issue

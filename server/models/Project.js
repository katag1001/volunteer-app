const mongoose = require('mongoose')
const Schema = mongoose.Schema

// prd.md §4.1. status is never set directly — it's derived bottom-up by
// api/utils/statusEngine.js from this project's issues, and only ever
// written by recalculateProjectStatus().
const ProjectSchema = new Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  created_by: { type: Schema.Types.ObjectId, ref: 'AuthUser', required: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  status: { type: String, enum: ['not_started', 'underway', 'resolved'], default: 'not_started' },
})

const Project = mongoose.model('Project', ProjectSchema)
module.exports = Project

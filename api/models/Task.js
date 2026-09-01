const mongoose = require('mongoose')
const Schema = mongoose.Schema

// prd.md §4.1. Created ahead of its own build-plan phase (B4, which owns
// the add-task/resolve flow) — see api/models/Issue.js's comment; the
// status engine needs a real Task collection to read statuses from.
// Unlike Issue/Project, Task.status is the one manually-set status in the
// whole system (prd.md §4.1) — nothing here derives it.
const TaskSchema = new Schema({
  issue_id: { type: Schema.Types.ObjectId, ref: 'Issue', required: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  assigned_to: { type: Schema.Types.ObjectId, ref: 'AuthUser', default: null },
  status: { type: String, enum: ['not_started', 'underway', 'resolved'], default: 'not_started' },
  created_by: { type: Schema.Types.ObjectId, ref: 'AuthUser', required: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  resolved_at: { type: Date, default: null },
  resolved_by: { type: Schema.Types.ObjectId, ref: 'AuthUser', default: null },
  resolution: { type: String, default: null },
})

const Task = mongoose.model('Task', TaskSchema)
module.exports = Task

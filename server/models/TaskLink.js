const mongoose = require('mongoose')
const Schema = mongoose.Schema

// prd.md §4.1. Simple attachments — no preview/validation beyond the URL
// being a URL (enforced in taskController, not here).
const TaskLinkSchema = new Schema({
  task_id: { type: Schema.Types.ObjectId, ref: 'Task', required: true },
  title: { type: String, required: true, trim: true },
  url: { type: String, required: true, trim: true },
  created_by: { type: Schema.Types.ObjectId, ref: 'AuthUser', required: true },
  created_at: { type: Date, default: Date.now },
})

const TaskLink = mongoose.model('TaskLink', TaskLinkSchema)
module.exports = TaskLink

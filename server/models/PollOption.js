const mongoose = require('mongoose')
const Schema = mongoose.Schema

// prd.md §4.1. Options can be added at any time by anyone on the project,
// not just at poll creation (enforced in pollController, not here).
const PollOptionSchema = new Schema({
  poll_id: { type: Schema.Types.ObjectId, ref: 'Poll', required: true },
  label: { type: String, required: true, trim: true },
  created_by: { type: Schema.Types.ObjectId, ref: 'AuthUser', required: true },
  created_at: { type: Date, default: Date.now },
})

const PollOption = mongoose.model('PollOption', PollOptionSchema)
module.exports = PollOption

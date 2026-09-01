const mongoose = require('mongoose')
const Schema = mongoose.Schema

// prd.md §4.1. Unique on (poll_id, option_id, user_id) — deliberately NOT
// (poll_id, user_id) — a member can vote for multiple options in the same
// poll simultaneously, and changes their vote by toggling individual rows
// on/off, not by replacing a single "my vote" row.
const PollVoteSchema = new Schema({
  poll_id: { type: Schema.Types.ObjectId, ref: 'Poll', required: true },
  option_id: { type: Schema.Types.ObjectId, ref: 'PollOption', required: true },
  user_id: { type: Schema.Types.ObjectId, ref: 'AuthUser', required: true },
  created_at: { type: Date, default: Date.now },
})

PollVoteSchema.index({ poll_id: 1, option_id: 1, user_id: 1 }, { unique: true })

const PollVote = mongoose.model('PollVote', PollVoteSchema)
module.exports = PollVote

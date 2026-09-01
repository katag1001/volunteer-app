const mongoose = require('mongoose')
const Schema = mongoose.Schema

// prd.md §4.1. Created ahead of its own build-plan phase (B5) — the status
// engine only needs to count polls per issue (prd.md §4.2: a poll alone
// moves an issue from not_started to underway, but never resolves it), so
// only the Poll collection itself is needed here, not PollOption/PollVote —
// those don't affect status math and stay owned by Phase B5.
const PollSchema = new Schema({
  issue_id: { type: Schema.Types.ObjectId, ref: 'Issue', required: true },
  question: { type: String, required: true, trim: true },
  created_by: { type: Schema.Types.ObjectId, ref: 'AuthUser', required: true },
  created_at: { type: Date, default: Date.now },
  closed_at: { type: Date, default: null },
})

const Poll = mongoose.model('Poll', PollSchema)
module.exports = Poll

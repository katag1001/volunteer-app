const mongoose = require('mongoose')
const Schema = mongoose.Schema

// prd.md §4.1. Issue membership is a subset of project membership, not
// automatically everyone — adding someone here requires them to already be
// a ProjectMember (enforced in issueController, not at the schema level).
const IssueMemberSchema = new Schema({
  issue_id: { type: Schema.Types.ObjectId, ref: 'Issue', required: true },
  user_id: { type: Schema.Types.ObjectId, ref: 'AuthUser', required: true },
  added_at: { type: Date, default: Date.now },
})

IssueMemberSchema.index({ issue_id: 1, user_id: 1 }, { unique: true })

const IssueMember = mongoose.model('IssueMember', IssueMemberSchema)
module.exports = IssueMember

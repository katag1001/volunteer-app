const mongoose = require('mongoose')
const Schema = mongoose.Schema

const DISPUTE_TYPES = ['too_small', 'too_big', 'no_item']
const DISPUTE_STATUSES = ['new', 'underway', 'resolved']

// status and picked_up_by only ever change together, through the
// pick-up / unpick / resolve / reopen actions in disputeController — never
// through the generic update endpoint.
const DisputeSchema = new Schema({
  type: { type: String, enum: DISPUTE_TYPES, required: true },
  date_raised: { type: Date, default: Date.now },
  picked_up_by: { type: Schema.Types.ObjectId, ref: 'AuthUser', default: null },
  status: { type: String, enum: DISPUTE_STATUSES, default: 'new' },
  order_no: { type: String, default: '', trim: true },
  user_no: { type: String, default: '', trim: true },
  details: { type: String, default: '', trim: true },
  resolution_notes: { type: String, default: '', trim: true },
})

const Dispute = mongoose.model('Dispute', DisputeSchema)
module.exports = Dispute
module.exports.DISPUTE_TYPES = DISPUTE_TYPES
module.exports.DISPUTE_STATUSES = DISPUTE_STATUSES

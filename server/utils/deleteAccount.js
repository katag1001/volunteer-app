const AuthUser = require('../models/AuthUser.js')
const Dispute = require('../models/Dispute.js')

// prd.md §3.6 — the single place an approved member's account is deleted
// from (self-delete and admin delete both go through here), so per-user
// cleanup has one obvious place to live.
//
// Disputes they still had underway go back to 'new' and unassigned so
// someone else can pick them up. Resolved disputes keep the dangling
// picked_up_by as a historical record (shown as "Deleted user").
//
// Not used by the two lazy-expiry purges in accountExpiry.js
// (unverified-after-3-days, unapproved-after-2-weeks) or by admin reject —
// those call AuthUser.deleteOne() directly, since an account that was never
// approved can't own anything else to clean up.
async function deleteUserAccount(userId) {
  await AuthUser.deleteOne({ _id: userId })
  await Dispute.updateMany({ picked_up_by: userId, status: 'underway' }, { status: 'new', picked_up_by: null })
}

module.exports = { deleteUserAccount }

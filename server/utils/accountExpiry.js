// prd.md §3.2 — two independent expiry clocks, both enforced lazily (no cron):
//   1. 3 days from created_at to verify the email.
//   2. 2 weeks from email_verified_at to be admin-approved.
// Neither produces a notification — the account just silently disappears.

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000
const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000

function isSignupExpired(user) {
  return !user.email_verified && Date.now() - user.created_at.getTime() > THREE_DAYS_MS
}

function isApprovalExpired(user) {
  return (
    user.email_verified &&
    !user.is_approved &&
    !!user.email_verified_at &&
    Date.now() - user.email_verified_at.getTime() > TWO_WEEKS_MS
  )
}

// Deletes the account if either lazy-expiry rule applies. Returns true if it
// was purged (callers should then treat the user as if it never existed).
async function purgeIfExpired(user) {
  if (isSignupExpired(user) || isApprovalExpired(user)) {
    await user.deleteOne()
    return true
  }
  return false
}

module.exports = { isSignupExpired, isApprovalExpired, purgeIfExpired, THREE_DAYS_MS, TWO_WEEKS_MS }

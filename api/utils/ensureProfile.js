const UserProfile = require('../models/UserProfile.js')

// Every approved member should have exactly one UserProfile from the moment
// they're approved (prd.md §3.5 — "on first login after approval, the user
// is prompted to complete their profile"), pre-filled with sensible
// defaults so there's never a null-profile edge case elsewhere in the app.
async function ensureProfileExists(authUser) {
  const existing = await UserProfile.findOne({ user_id: authUser._id })
  if (existing) return existing
  return UserProfile.create({ user_id: authUser._id, volunteer_since: authUser.created_at })
}

module.exports = { ensureProfileExists }

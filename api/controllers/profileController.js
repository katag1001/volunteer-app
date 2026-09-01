const AuthUser = require('../models/AuthUser.js')
const UserProfile = require('../models/UserProfile.js')
const { getMasterTeamList } = require('../utils/skillTeams.js')
const { deleteUserAccount } = require('../utils/deleteAccount.js')

const ABOUT_ME_MAX = 200
// Matches src/assets/images/profile_pictures/*.PNG on the frontend.
const PRESET_PICTURES = ['apple', 'banana', 'cherry', 'orange']
const LINK_PATTERN = /https?:\/\/|www\./i

// GET /profile/me
async function getMyProfile(req, res) {
  try {
    let profile = await UserProfile.findOne({ user_id: req.user._id })
    if (!profile) {
      // Should already exist from approval time (ensureProfileExists) — this
      // is just a safety net, not the normal path.
      profile = await UserProfile.create({ user_id: req.user._id, volunteer_since: req.user.created_at })
    }
    res.json({ profile: profile.toPublicJSON() })
  } catch {
    res.status(500).json({ error: 'failed_to_load_profile' })
  }
}

// PUT /profile/me
// prd.md §3.5 — same fields for both "complete your profile" and later
// edits; there's no separate "complete" endpoint, just this one, edited at
// different points in the user's lifecycle.
async function updateMyProfile(req, res) {
  const { profile_picture, skills, teams, email_visible, slack_link, slack_visible, about_me } = req.body || {}

  if (!Array.isArray(teams) || teams.length === 0) {
    return res.status(400).json({ error: 'teams_required' })
  }
  const masterTeams = getMasterTeamList()
  if (!teams.every((team) => masterTeams.includes(team))) {
    return res.status(400).json({ error: 'invalid_team' })
  }
  if (skills !== undefined && !Array.isArray(skills)) {
    return res.status(400).json({ error: 'invalid_skills' })
  }
  if (profile_picture !== undefined && profile_picture !== null && !PRESET_PICTURES.includes(profile_picture)) {
    return res.status(400).json({ error: 'invalid_profile_picture' })
  }
  if (about_me !== undefined) {
    if (about_me.length > ABOUT_ME_MAX) return res.status(400).json({ error: 'about_me_too_long' })
    if (LINK_PATTERN.test(about_me)) return res.status(400).json({ error: 'about_me_no_links' })
  }

  try {
    let profile = await UserProfile.findOne({ user_id: req.user._id })
    if (!profile) {
      profile = new UserProfile({ user_id: req.user._id, volunteer_since: req.user.created_at })
    }

    // prd.md §3.5 — the one-time skill->team auto-prefill trigger fires on
    // "the very first time a user adds a skill (skills goes from empty to
    // one entry)". The actual suggested team value is filled in client-side
    // before the user ever submits; this just marks that the triggering
    // event has now happened, so it can never fire again even if skills is
    // later cleared back to empty and re-added.
    if (!profile.skill_prefill_used && profile.skills.length === 0 && Array.isArray(skills) && skills.length === 1) {
      profile.skill_prefill_used = true
    }

    if (profile_picture !== undefined) profile.profile_picture = profile_picture
    if (skills !== undefined) profile.skills = skills
    profile.teams = teams
    if (email_visible !== undefined) profile.email_visible = !!email_visible
    if (slack_link !== undefined) profile.slack_link = slack_link
    if (slack_visible !== undefined) profile.slack_visible = !!slack_visible
    if (about_me !== undefined) profile.about_me = about_me

    await profile.save()
    res.json({ profile: profile.toPublicJSON() })
  } catch {
    res.status(500).json({ error: 'update_failed' })
  }
}

// DELETE /profile/me { password }
// prd.md §3.6 — self-delete, gated by re-entering your password. The seed
// admin can never be deleted, by anyone, through the UI — including
// themselves (prd.md §3.3).
async function deleteMyAccount(req, res) {
  const { password } = req.body || {}
  if (!password) {
    return res.status(400).json({ error: 'password_required' })
  }
  if (req.user.is_seed_admin) {
    return res.status(403).json({ error: 'seed_admin_protected' })
  }

  try {
    const user = await AuthUser.findById(req.user._id).select('+password_hash')
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'invalid_password' })
    }
    await deleteUserAccount(user._id)
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'delete_failed' })
  }
}

module.exports = { getMyProfile, updateMyProfile, deleteMyAccount }

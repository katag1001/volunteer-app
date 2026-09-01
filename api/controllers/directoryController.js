const AuthUser = require('../models/AuthUser.js')
const UserProfile = require('../models/UserProfile.js')
const { isRecentlyActive } = require('../utils/recentlyActive.js')

// GET /directory/members
// prd.md §3.7 — grid of every approved member's card-level info: enough to
// render the grid and drive the "key players only" / team filters. Not the
// full profile — that's gated by the member's own visibility toggles, see
// getMember below. teams/is_key_player aren't behind any toggle, so they're
// safe to include here for every viewer.
async function listMembers(req, res) {
  try {
    const approvedUsers = await AuthUser.find({ is_approved: true })
    const profiles = await UserProfile.find({ user_id: { $in: approvedUsers.map((u) => u._id) } })
    const profileByUserId = new Map(profiles.map((p) => [p.user_id.toString(), p]))

    const members = approvedUsers.map((user) => {
      const profile = profileByUserId.get(user._id.toString())
      return {
        id: user._id,
        first_name: user.first_name,
        last_name: user.last_name,
        profile_picture: profile?.profile_picture ?? null,
        teams: profile?.teams ?? [],
        is_key_player: profile?.is_key_player ?? false,
        recently_active: isRecentlyActive(profile?.last_login),
      }
    })

    res.json({ members })
  } catch {
    res.status(500).json({ error: 'failed_to_list_members' })
  }
}

// GET /directory/members/:id
// prd.md §3.7 — the full profile shown in the click-through modal,
// respecting *that member's own* email/Slack visibility toggles for
// whoever is viewing (not the assumption made for admin/approval screens,
// which is a separate, narrower carve-out — this is the general directory).
async function getMember(req, res) {
  try {
    const user = await AuthUser.findOne({ _id: req.params.id, is_approved: true })
    if (!user) return res.status(404).json({ error: 'not_found' })
    const profile = await UserProfile.findOne({ user_id: user._id })
    if (!profile) return res.status(404).json({ error: 'not_found' })

    res.json({
      member: {
        id: user._id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: profile.email_visible ? user.email : null,
        slack_link: profile.slack_visible ? profile.slack_link : null,
        profile_picture: profile.profile_picture,
        skills: profile.skills,
        teams: profile.teams,
        about_me: profile.about_me,
        is_key_player: profile.is_key_player,
        volunteer_since: profile.volunteer_since,
        recently_active: isRecentlyActive(profile.last_login),
      },
    })
  } catch {
    res.status(500).json({ error: 'failed_to_load_member' })
  }
}

module.exports = { listMembers, getMember }

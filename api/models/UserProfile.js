const mongoose = require('mongoose')
const Schema = mongoose.Schema

// prd.md §3.1 — the richer profile record, split from AuthUser deliberately.
const UserProfileSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'AuthUser', required: true, unique: true },
  volunteer_since: { type: Date, required: true }, // = AuthUser.created_at at signup; admin can edit directly in Mongo for legacy members
  profile_picture: { type: String, default: null },
  skills: { type: [String], default: [] },
  teams: { type: [String], default: [] },
  email_visible: { type: Boolean, default: false },
  slack_link: { type: String, default: '' },
  slack_visible: { type: Boolean, default: false },
  about_me: { type: String, default: '', maxlength: 200 },
  last_login: { type: Date, default: null },
  is_key_player: { type: Boolean, default: false },
  // Internal bookkeeping, not part of prd.md's field table — tracks whether
  // the one-time skill->team auto-prefill (prd.md §3.5) has already fired,
  // so it can't be re-triggered by later clearing skills back to empty.
  skill_prefill_used: { type: Boolean, default: false },
})

UserProfileSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    user_id: this.user_id,
    volunteer_since: this.volunteer_since,
    profile_picture: this.profile_picture,
    skills: this.skills,
    teams: this.teams,
    email_visible: this.email_visible,
    slack_link: this.slack_link,
    slack_visible: this.slack_visible,
    about_me: this.about_me,
    last_login: this.last_login,
    is_key_player: this.is_key_player,
    skill_prefill_used: this.skill_prefill_used,
  }
}

const UserProfile = mongoose.model('UserProfile', UserProfileSchema)
module.exports = UserProfile

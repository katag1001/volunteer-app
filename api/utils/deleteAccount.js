const AuthUser = require('../models/AuthUser.js')
const UserProfile = require('../models/UserProfile.js')
const ProjectMember = require('../models/ProjectMember.js')
const IssueMember = require('../models/IssueMember.js')
const Task = require('../models/Task.js')
const PollVote = require('../models/PollVote.js')

// prd.md §3.6 — deletes an AuthUser/UserProfile pair together, and cleans
// up every LIVE relationship this user held across all of Section B,
// account-wide (not scoped to one project, unlike leaveProject() — a
// deleted user may have been a member of many projects at once).
//
// Historical attribution (created_by/resolved_by on Project/Issue/Task/
// TaskLink/Poll/PollOption) is deliberately never touched — those
// references simply stop resolving. Every place that actually displays
// such a reference (currently just Task.resolved_by/assigned_to in
// taskController.listTasks) already falls back to "Deleted user" rather
// than crashing; nothing else in the app renders created_by today, so
// there's nothing further to guard.
//
// Not extended here: the two lazy-expiry purges in accountExpiry.js
// (unverified-after-3-days, unapproved-after-2-weeks) call
// AuthUser.deleteOne() directly rather than this function — deliberately,
// not an oversight. An account in either of those states can never have
// joined a project (Section B's routes all require requireActiveMember,
// i.e. verified + approved), so there is nothing for this cascade to clean
// up in that case.
async function deleteUserAccount(userId) {
  await AuthUser.deleteOne({ _id: userId })
  await UserProfile.deleteOne({ user_id: userId })
  await ProjectMember.deleteMany({ user_id: userId })
  await IssueMember.deleteMany({ user_id: userId })
  await Task.updateMany({ assigned_to: userId }, { assigned_to: null })
  await PollVote.deleteMany({ user_id: userId })
}

module.exports = { deleteUserAccount }

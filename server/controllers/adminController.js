const AuthUser = require('../models/AuthUser.js')
const { purgeIfExpired } = require('../utils/accountExpiry.js')
const { deleteUserAccount } = require('../utils/deleteAccount.js')

// Shared by listPendingUsers and pendingCount — verified-but-unapproved
// users, with the 2-week approval-expiry clock swept across all of them
// first, since each of these calls is a trigger point for that lazy sweep
// (the other is a login attempt, already handled in authController.login).
async function getStillPendingUsers() {
  const pending = await AuthUser.find({ email_verified: true, is_approved: false })
  const stillPending = []
  for (const user of pending) {
    if (!(await purgeIfExpired(user))) {
      stillPending.push(user)
    }
  }
  return stillPending
}

// GET /admin/pending-users
async function listPendingUsers(req, res) {
  try {
    const stillPending = await getStillPendingUsers()
    res.json({ users: stillPending.map((user) => user.toPublicJSON()) })
  } catch {
    res.status(500).json({ error: 'failed_to_list_pending_users' })
  }
}

// GET /admin/pending-users/count — cheap poll target for the nav badge, so
// the sidebar doesn't have to fetch (and render) the full pending list just
// to know whether to show a number.
async function pendingCount(req, res) {
  try {
    const stillPending = await getStillPendingUsers()
    res.json({ count: stillPending.length })
  } catch {
    res.status(500).json({ error: 'failed_to_count_pending_users' })
  }
}

// POST /admin/users/:id/approve
async function approveUser(req, res) {
  try {
    const user = await AuthUser.findById(req.params.id)
    if (!user) return res.status(404).json({ error: 'not_found' })
    if (!user.email_verified || user.is_approved) {
      return res.status(400).json({ error: 'not_pending' })
    }
    user.is_approved = true
    user.approved_at = new Date()
    await user.save()
    res.json({ user: user.toPublicJSON() })
  } catch {
    res.status(500).json({ error: 'approve_failed' })
  }
}

// POST /admin/users/:id/reject
// prd.md §3.2 — deletes immediately, silently. No notification, no
// strike-counting, no permanent block; they're free to sign up again.
async function rejectUser(req, res) {
  try {
    const user = await AuthUser.findById(req.params.id)
    if (!user) return res.status(404).json({ error: 'not_found' })
    if (!user.email_verified || user.is_approved) {
      return res.status(400).json({ error: 'not_pending' })
    }
    await user.deleteOne()
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'reject_failed' })
  }
}

// GET /admin/users — the full member list for the admin management view.
async function listUsers(req, res) {
  try {
    const users = await AuthUser.find({})
    res.json({ users: users.map((user) => user.toPublicJSON()) })
  } catch {
    res.status(500).json({ error: 'failed_to_list_users' })
  }
}

// PATCH /admin/users/:id/admin-status { is_admin: boolean }
// prd.md §3.3 — any admin can promote/demote any other user; the seed admin
// can never be demoted (or usefully re-promoted) by anyone, through the UI.
async function setAdminStatus(req, res) {
  const { is_admin } = req.body || {}
  if (typeof is_admin !== 'boolean') {
    return res.status(400).json({ error: 'invalid_input' })
  }

  try {
    const user = await AuthUser.findById(req.params.id)
    if (!user) return res.status(404).json({ error: 'not_found' })
    if (user.is_seed_admin) {
      return res.status(403).json({ error: 'seed_admin_protected' })
    }
    user.is_admin = is_admin
    await user.save()
    res.json({ user: user.toPublicJSON() })
  } catch {
    res.status(500).json({ error: 'update_failed' })
  }
}

// DELETE /admin/users/:id
// prd.md §3.3 — the seed admin can never be deleted. Deleting your own
// account goes through the dedicated self-delete flow (DELETE /account/me,
// requires re-entering your password), not this admin endpoint.
async function deleteUser(req, res) {
  try {
    const user = await AuthUser.findById(req.params.id)
    if (!user) return res.status(404).json({ error: 'not_found' })
    if (user.is_seed_admin) {
      return res.status(403).json({ error: 'seed_admin_protected' })
    }
    if (user._id.equals(req.user._id)) {
      return res.status(403).json({ error: 'use_self_delete' })
    }
    await deleteUserAccount(user._id)
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'delete_failed' })
  }
}

module.exports = {
  listPendingUsers,
  pendingCount,
  approveUser,
  rejectUser,
  listUsers,
  setAdminStatus,
  deleteUser,
}

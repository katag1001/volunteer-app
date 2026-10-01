const AuthUser = require('../models/AuthUser.js')
const { deleteUserAccount } = require('../utils/deleteAccount.js')

// DELETE /account/me { password }
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

module.exports = { deleteMyAccount }

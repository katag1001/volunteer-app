const AuthUser = require('../models/AuthUser.js')
const { signSessionToken } = require('../utils/jwt.js')
const { sessionStateFor } = require('../middleware/auth.js')
const { purgeIfExpired } = require('../utils/accountExpiry.js')
const {
  signVerificationToken,
  verifyVerificationToken,
  decodeExpiredVerificationToken,
} = require('../utils/verificationToken.js')
const {
  sendVerificationEmail,
  buildVerificationLink,
  sendPasswordResetEmail,
  buildResetLink,
  sendPendingApprovalEmail,
} = require('../utils/mailer.js')
const { signResetToken, verifyResetToken } = require('../utils/resetToken.js')
const { ensureProfileExists } = require('../utils/ensureProfile.js')
const UserProfile = require('../models/UserProfile.js')

const MIN_PASSWORD_LENGTH = 8

// prd.md §3.2 — creates the AuthUser and sends the verification email.
// The account exists (unverified, unapproved) the moment this returns; if
// the email genuinely never arrives, prd.md's answer is the lazy 3-day
// expiry, not a resend — so a failed send doesn't roll the signup back.
async function signup(req, res) {
  const { email, first_name, last_name, password } = req.body || {}
  if (!email || !first_name || !last_name || !password) {
    return res.status(400).json({ error: 'missing_fields' })
  }
  if (!email.includes('@')) {
    return res.status(400).json({ error: 'invalid_email' })
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: 'password_too_short' })
  }

  try {
    const user = new AuthUser({ email, first_name, last_name })
    user.password = password
    await user.save()

    const token = signVerificationToken(user)
    try {
      await sendVerificationEmail(user, token)
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError.message)
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log('Verification link (dev only):', buildVerificationLink(token))
    }

    res.status(201).json({ message: 'check_inbox' })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'email_taken' })
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: 'invalid_input' })
    }
    res.status(500).json({ error: 'signup_failed' })
  }
}

// prd.md §3.2/§3.3 — validates the link, marks the account verified, and
// applies the seed-admin bootstrap (auto-approve + flag) if the email
// matches ADMIN_EMAIL. An expired-but-genuine token purges the account
// instead (no resend in v1 — the user just signs up again).
async function verifyEmail(req, res) {
  const { token } = req.body || {}
  if (!token) {
    return res.status(400).json({ error: 'invalid_link' })
  }

  let payload
  try {
    payload = verifyVerificationToken(token)
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      try {
        const expiredPayload = decodeExpiredVerificationToken(token)
        const expiredUser = await AuthUser.findById(expiredPayload.sub)
        if (expiredUser && !expiredUser.email_verified) {
          await expiredUser.deleteOne()
        }
      } catch {
        // Signature didn't check out either — nothing genuine to clean up.
      }
      return res.status(410).json({ error: 'expired' })
    }
    return res.status(400).json({ error: 'invalid_link' })
  }

  try {
    const user = await AuthUser.findById(payload.sub)
    if (!user) {
      return res.status(400).json({ error: 'invalid_link' })
    }

    if (user.email_verified) {
      return res.json({ verified: true, autoApproved: user.is_approved, isAdmin: user.is_admin })
    }

    user.email_verified = true
    user.email_verified_at = new Date()

    const isSeedAdmin =
      !!process.env.ADMIN_EMAIL && user.email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase()
    if (isSeedAdmin) {
      user.is_admin = true
      user.is_seed_admin = true
      user.is_approved = true
      user.approved_at = new Date()
    }

    await user.save()
    if (isSeedAdmin) {
      await ensureProfileExists(user)
    } else {
      try {
        const admins = await AuthUser.find({ is_admin: true }).select('email')
        await sendPendingApprovalEmail(admins.map((admin) => admin.email), user)
      } catch (emailError) {
        console.error('Failed to send pending-approval notification:', emailError.message)
      }
    }

    res.json({ verified: true, autoApproved: isSeedAdmin, isAdmin: user.is_admin })
  } catch {
    res.status(500).json({ error: 'verification_failed' })
  }
}

// prd.md §3.4 — login is blocked unless email_verified && is_approved are
// both true. Also the opportunistic trigger point for both lazy expiry
// clocks (prd.md §3.2): a pending account past its deadline is purged here
// and treated exactly like "no such account".
async function login(req, res) {
  const { email, password } = req.body || {}
  if (!email || !password) {
    return res.status(400).json({ error: 'email_and_password_required' })
  }

  try {
    const user = await AuthUser.findOne({ email: email.toLowerCase().trim() }).select(
      '+password_hash'
    )
    if (!user) {
      return res.status(401).json({ error: 'invalid_credentials' })
    }

    if (await purgeIfExpired(user)) {
      return res.status(401).json({ error: 'invalid_credentials' })
    }

    if (!(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'invalid_credentials' })
    }

    const state = sessionStateFor(user)
    if (state === 'unverified' || state === 'unapproved') {
      return res.status(403).json({ error: state })
    }

    await UserProfile.updateOne({ user_id: user._id }, { last_login: new Date() })

    const token = signSessionToken(user)
    res.json({ token, user: user.toPublicJSON() })
  } catch (error) {
    console.error('Login failed:', error.message)
    res.status(500).json({ error: 'login_failed' })
  }
}

// prd.md §3.4 — "request -> emailed reset link -> set new password," same
// email transport as verification. Always responds with the same generic
// message regardless of whether the email matches an account, so this
// can't be used to probe which emails are registered.
async function forgotPassword(req, res) {
  const { email } = req.body || {}
  if (!email) {
    return res.status(400).json({ error: 'email_required' })
  }

  try {
    const user = await AuthUser.findOne({ email: email.toLowerCase().trim() })
    if (user) {
      const token = signResetToken(user)
      try {
        await sendPasswordResetEmail(user, token)
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError.message)
      }
      if (process.env.NODE_ENV !== 'production') {
        console.log('Password reset link (dev only):', buildResetLink(token))
      }
    }
    res.json({ message: 'check_inbox' })
  } catch {
    res.status(500).json({ error: 'request_failed' })
  }
}

// prd.md §3.4 — sets the new password. Unlike email verification, an
// expired or invalid link just fails here; there's no account to purge and
// the user can simply request a new one.
async function resetPassword(req, res) {
  const { token, password } = req.body || {}
  if (!token || !password) {
    return res.status(400).json({ error: 'invalid_request' })
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: 'password_too_short' })
  }

  let payload
  try {
    payload = verifyResetToken(token)
  } catch (error) {
    return res.status(error.name === 'TokenExpiredError' ? 410 : 400).json({
      error: error.name === 'TokenExpiredError' ? 'expired' : 'invalid_link',
    })
  }

  try {
    const user = await AuthUser.findById(payload.sub)
    if (!user) {
      return res.status(400).json({ error: 'invalid_link' })
    }
    user.password = password
    await user.save()
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'reset_failed' })
  }
}

// Reports session state without blocking — the frontend uses this to decide
// which holding screen (if any) to show.
function session(req, res) {
  res.json({
    state: req.sessionState,
    user: req.user ? req.user.toPublicJSON() : null,
  })
}

// Demo-only endpoint proving requireActiveMember actually blocks unverified
// / unapproved callers. Remove once a real protected route exists to demo instead.
function protectedDemo(req, res) {
  res.json({ ok: true, message: `Hello, ${req.user.first_name}. You're a verified, approved member.` })
}

// Demo-only endpoint proving requireAdmin actually blocks non-admins.
function adminDemo(req, res) {
  res.json({ ok: true, message: `Hello, ${req.user.first_name}. You're an admin.` })
}

module.exports = {
  signup,
  verifyEmail,
  login,
  forgotPassword,
  resetPassword,
  session,
  protectedDemo,
  adminDemo,
}

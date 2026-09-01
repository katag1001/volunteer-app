const AuthUser = require('../models/AuthUser.js')
const { verifySessionToken } = require('../utils/jwt.js')

function extractToken(req) {
  const header = req.headers.authorization || ''
  const [scheme, token] = header.split(' ')
  return scheme === 'Bearer' ? token : null
}

// Session state, matching the distinctions build-plan.md Phase A1 asks for.
// 'admin' implies verified+approved (an admin is always an active member
// too) — it's reported separately because it's the more specific state.
function sessionStateFor(user) {
  if (!user) return 'signed_out'
  if (!user.email_verified) return 'unverified'
  if (!user.is_approved) return 'unapproved'
  if (user.is_admin) return 'admin'
  return 'active'
}

// Soft check: decodes the token if present and attaches req.user (or null)
// and req.sessionState. Never blocks the request itself — used by routes
// like /auth/session that need to report state rather than enforce it.
async function attachUser(req, res, next) {
  const token = extractToken(req)
  const payload = verifySessionToken(token)

  if (!payload) {
    req.user = null
    req.sessionState = 'signed_out'
    return next()
  }

  try {
    const user = await AuthUser.findById(payload.sub)
    req.user = user || null
    req.sessionState = sessionStateFor(req.user)
    next()
  } catch (error) {
    next(error)
  }
}

// Hard check: 401s if there's no valid, signed-in user at all.
function requireAuth(req, res, next) {
  attachUser(req, res, (error) => {
    if (error) return next(error)
    if (!req.user) {
      return res.status(401).json({ error: 'signed_out' })
    }
    next()
  })
}

// Blocks unless the caller is a fully verified + approved member.
function requireActiveMember(req, res, next) {
  requireAuth(req, res, (error) => {
    if (error) return next(error)
    if (req.sessionState === 'unverified' || req.sessionState === 'unapproved') {
      return res.status(403).json({ error: req.sessionState })
    }
    next()
  })
}

// Blocks unless the caller is an active member AND an admin.
function requireAdmin(req, res, next) {
  requireActiveMember(req, res, (error) => {
    if (error) return next(error)
    if (req.sessionState !== 'admin') {
      return res.status(403).json({ error: 'forbidden' })
    }
    next()
  })
}

module.exports = {
  attachUser,
  requireAuth,
  requireActiveMember,
  requireAdmin,
  sessionStateFor,
}

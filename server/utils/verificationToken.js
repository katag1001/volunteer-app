const jwt = require('jsonwebtoken')

const PURPOSE = 'verify_email'
const TOKEN_TTL = '3d' // prd.md §3.2 — the 3-day signup verification window

function signVerificationToken(user) {
  return jwt.sign({ sub: user._id.toString(), purpose: PURPOSE }, process.env.AUTH_SECRET, {
    expiresIn: TOKEN_TTL,
  })
}

function assertPurpose(payload) {
  if (payload.purpose !== PURPOSE) {
    const error = new Error('Token is not a verification token')
    error.name = 'JsonWebTokenError'
    throw error
  }
  return payload
}

// Throws (TokenExpiredError / JsonWebTokenError) if the token is invalid or expired.
function verifyVerificationToken(token) {
  return assertPurpose(jwt.verify(token, process.env.AUTH_SECRET))
}

// Verifies the *signature* while ignoring expiry, so an expired-but-genuine
// token can still be trusted to identify which account to purge. Throws if
// the signature itself doesn't check out (a forged/tampered token).
function decodeExpiredVerificationToken(token) {
  return assertPurpose(jwt.verify(token, process.env.AUTH_SECRET, { ignoreExpiration: true }))
}

module.exports = { signVerificationToken, verifyVerificationToken, decodeExpiredVerificationToken }

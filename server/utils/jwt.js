const jwt = require('jsonwebtoken')

const TOKEN_TTL = '7d'

function signSessionToken(user) {
  return jwt.sign({ sub: user._id.toString() }, process.env.AUTH_SECRET, {
    expiresIn: TOKEN_TTL,
  })
}

// Returns the decoded payload, or null if the token is missing/invalid/expired.
// Deliberately swallows verification errors here — callers treat "no valid
// token" as "signed out" rather than a hard failure.
function verifySessionToken(token) {
  if (!token) return null
  try {
    return jwt.verify(token, process.env.AUTH_SECRET)
  } catch {
    return null
  }
}

module.exports = { signSessionToken, verifySessionToken }

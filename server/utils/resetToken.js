const jwt = require('jsonwebtoken')

const PURPOSE = 'reset_password'
const TOKEN_TTL = '1h' // shorter than the 3-day verification window — this is a security-sensitive action, and unlike verification, an expired link just means "request a new one," not account deletion

function signResetToken(user) {
  return jwt.sign({ sub: user._id.toString(), purpose: PURPOSE }, process.env.AUTH_SECRET, {
    expiresIn: TOKEN_TTL,
  })
}

// Throws (TokenExpiredError / JsonWebTokenError) if the token is invalid or expired.
function verifyResetToken(token) {
  const payload = jwt.verify(token, process.env.AUTH_SECRET)
  if (payload.purpose !== PURPOSE) {
    const error = new Error('Token is not a password-reset token')
    error.name = 'JsonWebTokenError'
    throw error
  }
  return payload
}

module.exports = { signResetToken, verifyResetToken }

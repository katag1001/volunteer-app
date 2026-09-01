const nodemailer = require('nodemailer')

let transporter = null

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
      },
    })
  }
  return transporter
}

function sendMail({ to, subject, html }) {
  return getTransporter().sendMail({ from: process.env.EMAIL_USER, to, subject, html })
}

function buildVerificationLink(token) {
  return `${process.env.FRONTEND_URL}/verify?token=${encodeURIComponent(token)}`
}

function sendVerificationEmail(user, token) {
  const link = buildVerificationLink(token)
  return sendMail({
    to: user.email,
    subject: 'Verify your email — Cherry Volunteer Organiser',
    html: `
      <p>Hi ${user.first_name},</p>
      <p>Welcome to the Cherry Volunteer Organiser. Click below to verify your email address — this link expires in 3 days.</p>
      <p><a href="${link}">${link}</a></p>
    `,
  })
}

function buildResetLink(token) {
  return `${process.env.FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`
}

function sendPasswordResetEmail(user, token) {
  const link = buildResetLink(token)
  return sendMail({
    to: user.email,
    subject: 'Reset your password — Cherry Volunteer Organiser',
    html: `
      <p>Hi ${user.first_name},</p>
      <p>Click below to set a new password — this link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
      <p><a href="${link}">${link}</a></p>
    `,
  })
}

module.exports = {
  sendMail,
  buildVerificationLink,
  sendVerificationEmail,
  buildResetLink,
  sendPasswordResetEmail,
}

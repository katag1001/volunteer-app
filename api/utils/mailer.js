const nodemailer = require('nodemailer')

// Where to point links in emails (verify/reset/approvals) back at.
// - Local dev: FRONTEND_URL from .env (http://localhost:5173).
// - Vercel: falls back to the project's assigned production domain, then to
//   the current deployment's own URL, so links work without having to set
//   FRONTEND_URL by hand in the Vercel dashboard. Both are supplied
//   automatically by Vercel and come without a protocol.
const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
  (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
  'http://localhost:5173'

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
  return `${FRONTEND_URL}/verify?token=${encodeURIComponent(token)}`
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
  return `${FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`
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

function buildApprovalsLink() {
  return `${FRONTEND_URL}/admin?tab=approvals`
}

// Notifies every current admin that a new signup is waiting in the
// approvals queue. Sent once, right when a user becomes pending (see
// authController.verifyEmail) — not a digest, so admins can act promptly.
function sendPendingApprovalEmail(adminEmails, user) {
  if (!adminEmails || adminEmails.length === 0) return Promise.resolve()
  const link = buildApprovalsLink()
  return sendMail({
    to: adminEmails,
    subject: 'New signup awaiting approval — Cherry Volunteer Organiser',
    html: `
      <p>Hi,</p>
      <p>${user.first_name} ${user.last_name} (${user.email}) has verified their email and is waiting to be approved.</p>
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
  buildApprovalsLink,
  sendPendingApprovalEmail,
}

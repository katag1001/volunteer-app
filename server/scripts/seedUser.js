// Creates (or updates) an AuthUser directly, bypassing the signup/verification/
// approval flow — those don't exist yet (Phase A2/A3). This is how Phase A1's
// "seeded test user can log in" demo is satisfied.
//
// Usage:
//   node scripts/seedUser.js --email test@example.com --password Passw0rd! \
//     --first Jane --last Doe [--verified] [--approved] [--admin]
//
// --admin implies --verified --approved (an admin must be an active member).

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env'), quiet: true })
const mongoose = require('mongoose')
const AuthUser = require('../models/AuthUser.js')

function parseArgs(argv) {
  const args = { verified: false, approved: false, admin: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--verified') args.verified = true
    else if (arg === '--approved') args.approved = true
    else if (arg === '--admin') args.admin = true
    else if (arg.startsWith('--')) {
      args[arg.slice(2)] = argv[++i]
    }
  }
  return args
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!args.email || !args.password || !args.first || !args.last) {
    console.error(
      'Usage: node scripts/seedUser.js --email <email> --password <password> --first <first> --last <last> [--verified] [--approved] [--admin]'
    )
    process.exit(1)
  }

  const verified = args.verified || args.admin
  const approved = args.approved || args.admin
  const now = new Date()

  await mongoose.connect(process.env.MONGODB_URI)

  const existing = await AuthUser.findOne({ email: args.email.toLowerCase().trim() })
  if (existing) {
    console.error(`A user with email ${args.email} already exists (id: ${existing._id}). Aborting.`)
    process.exit(1)
  }

  const user = new AuthUser({
    email: args.email,
    first_name: args.first,
    last_name: args.last,
    email_verified: verified,
    email_verified_at: verified ? now : null,
    is_approved: approved,
    approved_at: approved ? now : null,
    is_admin: args.admin,
  })
  user.password = args.password
  await user.save()

  console.log('Seeded user:', user.toPublicJSON())
  await mongoose.disconnect()
}

main().catch((error) => {
  console.error('Seed failed:', error)
  process.exit(1)
})

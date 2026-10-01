// One-off cleanup after the profile/directory/projects/issues removal:
// drops every MongoDB collection whose model no longer exists. The live
// collections (KEPT_COLLECTIONS) are never touched.
//
// Usage:
//   node server/scripts/dropRemovedCollections.js            # dry run — lists what would be dropped
//   node server/scripts/dropRemovedCollections.js --confirm  # actually drops them
//
// Connects to MONGODB_URI from the repo-root .env. To clean a different
// database (e.g. production), override it for the one run:
//   MONGODB_URI="mongodb+srv://..." node server/scripts/dropRemovedCollections.js --confirm

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env'), quiet: true })
const mongoose = require('mongoose')

// Mongoose's default (lowercased, pluralised) collection names for the
// removed models.
const KEPT_COLLECTIONS = ['authusers', 'disputes']

const REMOVED_COLLECTIONS = [
  'userprofiles',
  'projects',
  'projectmembers',
  'projectteams',
  'issues',
  'issuemembers',
  'tasks',
  'tasklinks',
  'polls',
  'polloptions',
  'pollvotes',
]

async function main() {
  const confirm = process.argv.includes('--confirm')
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set.')
    process.exit(1)
  }

  await mongoose.connect(process.env.MONGODB_URI)
  const db = mongoose.connection.db
  console.log(`Connected to database "${db.databaseName}" on ${mongoose.connection.host}`)

  const existing = new Set((await db.listCollections().toArray()).map((c) => c.name))
  const toDrop = REMOVED_COLLECTIONS.filter((name) => existing.has(name))
  const leftover = [...existing].filter((name) => !KEPT_COLLECTIONS.includes(name) && !REMOVED_COLLECTIONS.includes(name))

  if (toDrop.length === 0) {
    console.log('Nothing to drop — none of the removed collections exist.')
  }
  for (const name of toDrop) {
    const count = await db.collection(name).countDocuments()
    if (confirm) {
      await db.dropCollection(name)
      console.log(`Dropped ${name} (${count} documents)`)
    } else {
      console.log(`Would drop ${name} (${count} documents)`)
    }
  }
  if (leftover.length > 0) {
    console.log(`Not touched (unrecognised, check manually): ${leftover.join(', ')}`)
  }
  if (!confirm && toDrop.length > 0) {
    console.log('\nDry run only. Re-run with --confirm to drop these collections.')
  }

  await mongoose.disconnect()
}

main().catch((error) => {
  console.error('Cleanup failed:', error)
  process.exit(1)
})

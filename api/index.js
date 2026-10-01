const app      = require('express')()
// Loaded via an explicit path (not cwd-relative) since this file runs both
// as `node api/index.js` (cwd = repo root) and as a bundled Vercel function.
require("dotenv").config({ path: require('path').join(__dirname, '..', '.env'), quiet: true })
const { connectToDatabase } = require('../server/config/db.js')
const port     = process.env.PORT || 4444

app.use(require("express").urlencoded({extended: true}))
app.use(require("express").json())

//==========================================================================
app.use(require('cors')())
// Serverless cold starts run this module before any connection exists, so
// requests must wait for it explicitly - otherwise Mongoose's own query
// buffer (10s) times out first and masks the real connection error.
app.use((req, res, next) => {
  connectToDatabase()
    .then(() => next())
    .catch((error) => {
      console.error('DB connection failed:', error.message)
      res.status(503).json({ error: 'database_unavailable' })
    })
})
//==========================================================================
app.use('/api/auth',require('../server/routes/authRoutes.js'))
app.use('/api/admin',require('../server/routes/adminRoutes.js'))
app.use('/api/account',require('../server/routes/accountRoutes.js'))
app.use('/api/disputes',require('../server/routes/disputeRoutes.js'))
//==========================================================================
// Vercel imports this file as a serverless function and calls the exported
// app directly, so only start a listening server when run as a normal
// process (`node index.js` / `npm run dev`).
if (require.main === module) {
  app.listen(port, () => console.log("🚀 Listening on port: " + port + " 🚀"));
}

module.exports = app
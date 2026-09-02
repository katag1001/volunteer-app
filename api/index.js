const app      = require('express')()
require("dotenv").config({ quiet: true })
const { connectToDatabase } = require('./config/db.js')
const port     = process.env.PORT || 4444

app.use(require("express").urlencoded({extended: true}))
app.use(require("express").json())

connectToDatabase().catch(() => {})

//==========================================================================
app.use(require('cors')())
//==========================================================================
app.use('/api/auth',require('./routes/authRoutes.js'))
app.use('/api/admin',require('./routes/adminRoutes.js'))
app.use('/api/profile',require('./routes/profileRoutes.js'))
app.use('/api/directory',require('./routes/directoryRoutes.js'))
app.use('/api/projects',require('./routes/projectRoutes.js'))
app.use('/api/issues',require('./routes/issueRoutes.js'))
app.use('/api/tasks',require('./routes/taskRoutes.js'))
app.use('/api/polls',require('./routes/pollRoutes.js'))
//==========================================================================
// Vercel imports this file as a serverless function and calls the exported
// app directly, so only start a listening server when run as a normal
// process (`node index.js` / `npm run dev`).
if (require.main === module) {
  app.listen(port, () => console.log("🚀 Listening on port: " + port + " 🚀"));
}

module.exports = app
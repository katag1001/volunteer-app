const app      = require('express')()
require("dotenv").config()
const { connectToDatabase } = require('./config/db.js')
const port     = process.env.PORT || 4444

app.use(require("express").urlencoded({extended: true}))
app.use(require("express").json())

connectToDatabase().catch(() => {})

//==========================================================================
app.use(require('cors')())
//==========================================================================
app.use('/auth',require('./routes/authRoutes.js'))
app.use('/admin',require('./routes/adminRoutes.js'))
app.use('/profile',require('./routes/profileRoutes.js'))
app.use('/directory',require('./routes/directoryRoutes.js'))
app.use('/projects',require('./routes/projectRoutes.js'))
app.use('/issues',require('./routes/issueRoutes.js'))
app.use('/tasks',require('./routes/taskRoutes.js'))
app.use('/polls',require('./routes/pollRoutes.js'))
//==========================================================================
app.listen(port, () => console.log("🚀 Listening on port: " + port + " 🚀"));
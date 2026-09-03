const mongoose = require('mongoose')

let connectionPromise = null

// Reuses a single connection across calls instead of reconnecting on every
// invocation - keeps this safe to call from anywhere without worrying about
// duplicate connections if the app is ever moved behind serverless functions.
function connectToDatabase() {
  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 })
      .then((conn) => {
        console.log('Connected to the DB ✅')
        return conn
      })
      .catch((error) => {
        connectionPromise = null
        console.error('ERROR: could not connect to MongoDB ☢️', error.message)
        throw error
      })
  }
  return connectionPromise
}

module.exports = { connectToDatabase }

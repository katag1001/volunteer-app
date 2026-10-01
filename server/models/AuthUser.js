const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const Schema = mongoose.Schema

const SALT_ROUNDS = 10

// prd.md §3.1 — the credentials/identity record, and currently the only
// per-user record in the app.
const AuthUserSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password_hash: {
    type: String,
    required: true,
    select: false,
  },
  first_name: { type: String, required: true, trim: true },
  last_name: { type: String, required: true, trim: true },
  email_verified: { type: Boolean, default: false },
  email_verified_at: { type: Date, default: null },
  is_approved: { type: Boolean, default: false },
  approved_at: { type: Date, default: null },
  is_admin: { type: Boolean, default: false },
  is_seed_admin: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
})

// Write `user.password = 'plaintext'` and save() hashes it into
// password_hash — the plaintext itself is never persisted or stored on the
// document beyond the lifetime of this save.
AuthUserSchema.virtual('password').set(function setPassword(plainPassword) {
  this._plainPassword = plainPassword
})

AuthUserSchema.pre('validate', async function hashPassword() {
  if (!this._plainPassword) return
  this.password_hash = await bcrypt.hash(this._plainPassword, SALT_ROUNDS)
  this._plainPassword = undefined
})

AuthUserSchema.methods.comparePassword = function comparePassword(plainPassword) {
  // Requires the document to have been fetched with .select('+password_hash').
  return bcrypt.compare(plainPassword, this.password_hash)
}

AuthUserSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id,
    email: this.email,
    first_name: this.first_name,
    last_name: this.last_name,
    email_verified: this.email_verified,
    is_approved: this.is_approved,
    is_admin: this.is_admin,
    is_seed_admin: this.is_seed_admin,
    created_at: this.created_at,
  }
}

const AuthUser = mongoose.model('AuthUser', AuthUserSchema)
module.exports = AuthUser

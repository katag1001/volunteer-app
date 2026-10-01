const mongoose = require('mongoose')
const Dispute = require('../models/Dispute.js')
const { DISPUTE_TYPES } = require('../models/Dispute.js')
const AuthUser = require('../models/AuthUser.js')

const TEXT_FIELDS = ['order_no', 'user_no', 'details', 'resolution_notes']

// Resolves each dispute's picked_up_by to { id, first_name, last_name } in
// one AuthUser query. A reference to a user that no longer exists (only
// possible on a resolved dispute — see deleteUserAccount) comes back as
// "Deleted user" rather than null, so it still reads as picked up.
async function serializeDisputes(disputes) {
  const userIds = [...new Set(disputes.filter((d) => d.picked_up_by).map((d) => d.picked_up_by.toString()))]
  const users = await AuthUser.find({ _id: { $in: userIds } }, 'first_name last_name')
  const userById = new Map(users.map((u) => [u._id.toString(), u]))

  return disputes.map((dispute) => {
    let pickedUpBy = null
    if (dispute.picked_up_by) {
      const user = userById.get(dispute.picked_up_by.toString())
      pickedUpBy = user
        ? { id: user._id, first_name: user.first_name, last_name: user.last_name }
        : { id: dispute.picked_up_by, first_name: 'Deleted', last_name: 'user' }
    }
    return {
      id: dispute._id,
      type: dispute.type,
      date_raised: dispute.date_raised,
      status: dispute.status,
      picked_up_by: pickedUpBy,
      order_no: dispute.order_no,
      user_no: dispute.user_no,
      details: dispute.details,
      resolution_notes: dispute.resolution_notes,
    }
  })
}

async function serializeDispute(dispute) {
  const [serialized] = await serializeDisputes([dispute])
  return serialized
}

// Shared by every /:id handler — 404s on a malformed id the same as on a
// missing one, rather than letting Mongoose's CastError surface as a 500.
async function findDisputeOr404(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404).json({ error: 'not_found' })
    return null
  }
  const dispute = await Dispute.findById(req.params.id)
  if (!dispute) res.status(404).json({ error: 'not_found' })
  return dispute
}

// Only the person who picked a dispute up — or any admin — can undo,
// resolve or reopen it.
function canManage(req, dispute) {
  return req.sessionState === 'admin' || (!!dispute.picked_up_by && dispute.picked_up_by.equals(req.user._id))
}

// Picks the allowed free-text fields out of a request body. Returns null if
// any of them isn't a string.
function readTextFields(body) {
  const fields = {}
  for (const field of TEXT_FIELDS) {
    if (body[field] === undefined) continue
    if (typeof body[field] !== 'string') return null
    fields[field] = body[field]
  }
  return fields
}

// GET /disputes?mine=true
async function listDisputes(req, res) {
  try {
    const filter = req.query.mine === 'true' ? { picked_up_by: req.user._id } : {}
    const disputes = await Dispute.find(filter).sort({ date_raised: 1 })
    res.json({ disputes: await serializeDisputes(disputes) })
  } catch {
    res.status(500).json({ error: 'failed_to_list_disputes' })
  }
}

// POST /disputes { type, order_no?, user_no?, details? }
async function createDispute(req, res) {
  const body = req.body || {}
  if (!DISPUTE_TYPES.includes(body.type)) {
    return res.status(400).json({ error: 'invalid_type' })
  }
  const fields = readTextFields(body)
  if (!fields) return res.status(400).json({ error: 'invalid_input' })
  delete fields.resolution_notes

  try {
    const dispute = await Dispute.create({ type: body.type, ...fields })
    res.status(201).json({ dispute: await serializeDispute(dispute) })
  } catch {
    res.status(500).json({ error: 'create_failed' })
  }
}

// GET /disputes/:id
async function getDispute(req, res) {
  try {
    const dispute = await findDisputeOr404(req, res)
    if (!dispute) return
    res.json({ dispute: await serializeDispute(dispute) })
  } catch {
    res.status(500).json({ error: 'failed_to_load_dispute' })
  }
}

// PATCH /disputes/:id { type?, order_no?, user_no?, details?, resolution_notes? }
// Plain field edits only — status/picked_up_by move through the action
// endpoints below.
async function updateDispute(req, res) {
  const body = req.body || {}
  if (body.type !== undefined && !DISPUTE_TYPES.includes(body.type)) {
    return res.status(400).json({ error: 'invalid_type' })
  }
  const fields = readTextFields(body)
  if (!fields) return res.status(400).json({ error: 'invalid_input' })

  try {
    const dispute = await findDisputeOr404(req, res)
    if (!dispute) return
    if (body.type !== undefined) dispute.type = body.type
    Object.assign(dispute, fields)
    await dispute.save()
    res.json({ dispute: await serializeDispute(dispute) })
  } catch {
    res.status(500).json({ error: 'update_failed' })
  }
}

// DELETE /disputes/:id — admin only (enforced in disputeRoutes).
async function deleteDispute(req, res) {
  try {
    const dispute = await findDisputeOr404(req, res)
    if (!dispute) return
    await dispute.deleteOne()
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'delete_failed' })
  }
}

// POST /disputes/:id/pick-up — new -> underway, picked up by the caller.
async function pickUpDispute(req, res) {
  try {
    const dispute = await findDisputeOr404(req, res)
    if (!dispute) return
    if (dispute.status !== 'new') {
      return res.status(409).json({ error: 'already_picked_up' })
    }
    dispute.status = 'underway'
    dispute.picked_up_by = req.user._id
    await dispute.save()
    res.json({ dispute: await serializeDispute(dispute) })
  } catch {
    res.status(500).json({ error: 'pick_up_failed' })
  }
}

// POST /disputes/:id/unpick — underway -> new, picked_up_by cleared.
async function unpickDispute(req, res) {
  try {
    const dispute = await findDisputeOr404(req, res)
    if (!dispute) return
    if (dispute.status !== 'underway') {
      return res.status(409).json({ error: 'not_underway' })
    }
    if (!canManage(req, dispute)) {
      return res.status(403).json({ error: 'forbidden' })
    }
    dispute.status = 'new'
    dispute.picked_up_by = null
    await dispute.save()
    res.json({ dispute: await serializeDispute(dispute) })
  } catch {
    res.status(500).json({ error: 'unpick_failed' })
  }
}

// POST /disputes/:id/resolve { resolution_notes } — underway -> resolved.
async function resolveDispute(req, res) {
  const { resolution_notes } = req.body || {}
  if (resolution_notes !== undefined && typeof resolution_notes !== 'string') {
    return res.status(400).json({ error: 'invalid_input' })
  }

  try {
    const dispute = await findDisputeOr404(req, res)
    if (!dispute) return
    if (dispute.status !== 'underway') {
      return res.status(409).json({ error: 'not_underway' })
    }
    if (!canManage(req, dispute)) {
      return res.status(403).json({ error: 'forbidden' })
    }
    dispute.status = 'resolved'
    if (resolution_notes !== undefined) dispute.resolution_notes = resolution_notes
    await dispute.save()
    res.json({ dispute: await serializeDispute(dispute) })
  } catch {
    res.status(500).json({ error: 'resolve_failed' })
  }
}

// POST /disputes/:id/reopen — resolved -> underway. Keeps picked_up_by and
// resolution_notes (the notes are pre-filled again on the next resolve).
async function reopenDispute(req, res) {
  try {
    const dispute = await findDisputeOr404(req, res)
    if (!dispute) return
    if (dispute.status !== 'resolved') {
      return res.status(409).json({ error: 'not_resolved' })
    }
    if (!canManage(req, dispute)) {
      return res.status(403).json({ error: 'forbidden' })
    }
    dispute.status = 'underway'
    await dispute.save()
    res.json({ dispute: await serializeDispute(dispute) })
  } catch {
    res.status(500).json({ error: 'reopen_failed' })
  }
}

module.exports = {
  listDisputes,
  createDispute,
  getDispute,
  updateDispute,
  deleteDispute,
  pickUpDispute,
  unpickDispute,
  resolveDispute,
  reopenDispute,
}

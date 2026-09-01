const Poll = require('../models/Poll.js')
const PollOption = require('../models/PollOption.js')
const PollVote = require('../models/PollVote.js')
const Issue = require('../models/Issue.js')
const { isProjectMember } = require('../utils/isProjectMember.js')
const { recalculateIssueStatus } = require('../utils/statusEngine.js')

// GET /issues/:issueId/polls
// prd.md §4.6 — self-serve/open to view, same as everything else in
// Section B. Includes each option's live vote count and whether the
// current viewer has voted for it, so the frontend can render toggle state.
async function listPolls(req, res) {
  try {
    const polls = await Poll.find({ issue_id: req.params.issueId }).sort({ created_at: 1 })
    const pollIds = polls.map((p) => p._id)

    const options = await PollOption.find({ poll_id: { $in: pollIds } }).sort({ created_at: 1 })
    const optionIds = options.map((o) => o._id)
    const votes = await PollVote.find({ option_id: { $in: optionIds } })

    const voteCountByOption = new Map()
    const myVotedOptions = new Set()
    for (const vote of votes) {
      const key = vote.option_id.toString()
      voteCountByOption.set(key, (voteCountByOption.get(key) || 0) + 1)
      if (vote.user_id.equals(req.user._id)) myVotedOptions.add(key)
    }

    const optionsByPoll = new Map()
    for (const option of options) {
      const key = option.poll_id.toString()
      if (!optionsByPoll.has(key)) optionsByPoll.set(key, [])
      optionsByPoll.get(key).push({
        id: option._id,
        label: option.label,
        vote_count: voteCountByOption.get(option._id.toString()) || 0,
        voted_by_me: myVotedOptions.has(option._id.toString()),
      })
    }

    res.json({
      polls: polls.map((poll) => ({
        id: poll._id,
        question: poll.question,
        closed_at: poll.closed_at,
        options: optionsByPoll.get(poll._id.toString()) || [],
      })),
    })
  } catch {
    res.status(500).json({ error: 'failed_to_list_polls' })
  }
}

// POST /issues/:issueId/polls { question, options: [string, ...] }
// prd.md §4.6 — any project member; at least one initial option required.
// A poll's mere existence moves the issue from not_started to underway
// (prd.md §4.2), even with zero tasks, so status is recalculated.
async function createPoll(req, res) {
  const { question, options } = req.body || {}
  if (!question || !question.trim()) {
    return res.status(400).json({ error: 'question_required' })
  }
  const cleanOptions = Array.isArray(options) ? options.map((o) => (o || '').trim()).filter(Boolean) : []
  if (cleanOptions.length === 0) {
    return res.status(400).json({ error: 'options_required' })
  }

  try {
    const issue = await Issue.findById(req.params.issueId)
    if (!issue) return res.status(404).json({ error: 'issue_not_found' })
    if (!(await isProjectMember(issue.project_id, req.user._id))) {
      return res.status(403).json({ error: 'must_be_project_member' })
    }

    const poll = await Poll.create({ issue_id: issue._id, question: question.trim(), created_by: req.user._id })
    await PollOption.insertMany(
      cleanOptions.map((label) => ({ poll_id: poll._id, label, created_by: req.user._id }))
    )
    await recalculateIssueStatus(issue._id)

    res.status(201).json({ poll: { id: poll._id, question: poll.question } })
  } catch {
    res.status(500).json({ error: 'create_failed' })
  }
}

// POST /polls/:id/options { label }
// prd.md §4.6 — any project member, any time — but only while the poll is
// still open; a closed poll's results are final, so a new unvotable option
// wouldn't make sense (prd.md doesn't spell this edge case out explicitly,
// but "final result" implies the option set is frozen too).
async function addPollOption(req, res) {
  const { label } = req.body || {}
  if (!label || !label.trim()) {
    return res.status(400).json({ error: 'label_required' })
  }

  try {
    const poll = await Poll.findById(req.params.id)
    if (!poll) return res.status(404).json({ error: 'not_found' })
    const issue = await Issue.findById(poll.issue_id)
    if (!(await isProjectMember(issue.project_id, req.user._id))) {
      return res.status(403).json({ error: 'must_be_project_member' })
    }
    if (poll.closed_at) return res.status(400).json({ error: 'poll_closed' })

    const option = await PollOption.create({ poll_id: poll._id, label: label.trim(), created_by: req.user._id })
    res.status(201).json({ option: { id: option._id, label: option.label } })
  } catch {
    res.status(500).json({ error: 'add_option_failed' })
  }
}

// POST /polls/:id/vote { option_id }
// prd.md §4.6 — toggles a single (poll, option, user) vote row on/off.
// Multi-select and changeable any time before the poll closes.
async function toggleVote(req, res) {
  const { option_id } = req.body || {}
  if (!option_id) {
    return res.status(400).json({ error: 'option_id_required' })
  }

  try {
    const poll = await Poll.findById(req.params.id)
    if (!poll) return res.status(404).json({ error: 'not_found' })
    const issue = await Issue.findById(poll.issue_id)
    if (!(await isProjectMember(issue.project_id, req.user._id))) {
      return res.status(403).json({ error: 'must_be_project_member' })
    }
    if (poll.closed_at) return res.status(400).json({ error: 'poll_closed' })

    const option = await PollOption.findOne({ _id: option_id, poll_id: poll._id })
    if (!option) return res.status(400).json({ error: 'invalid_option' })

    const existingVote = await PollVote.findOne({ poll_id: poll._id, option_id, user_id: req.user._id })
    if (existingVote) {
      await existingVote.deleteOne()
      return res.json({ voted: false })
    }
    await PollVote.create({ poll_id: poll._id, option_id, user_id: req.user._id })
    res.json({ voted: true })
  } catch {
    res.status(500).json({ error: 'vote_failed' })
  }
}

// POST /polls/:id/close
// prd.md §4.6 — any project member, not just the creator. Never changes
// issue/project status by itself — purely informational.
async function closePoll(req, res) {
  try {
    const poll = await Poll.findById(req.params.id)
    if (!poll) return res.status(404).json({ error: 'not_found' })
    const issue = await Issue.findById(poll.issue_id)
    if (!(await isProjectMember(issue.project_id, req.user._id))) {
      return res.status(403).json({ error: 'must_be_project_member' })
    }
    if (poll.closed_at) return res.status(400).json({ error: 'already_closed' })

    poll.closed_at = new Date()
    await poll.save()
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'close_failed' })
  }
}

module.exports = { listPolls, createPoll, addPollOption, toggleVote, closePoll }

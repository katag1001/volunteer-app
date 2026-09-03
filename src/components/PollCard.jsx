import { useState } from 'react'
import { Button } from './ui'
import { apiRequest } from '../lib/api.js'
import { getToken } from '../lib/session.js'
import './PollCard.css'

// prd.md §4.6 — multi-select, changeable any time before the poll closes;
// once closed, votes are frozen and shown as the final tally, but any
// project member can reopen a closed poll to allow voting again.
function PollCard({ poll, isMember, onChanged }) {
  const [newOption, setNewOption] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const isClosed = !!poll.closed_at

  const handleVote = async (optionId) => {
    if (isClosed || !isMember) return
    setBusy(true)
    try {
      await apiRequest(`/polls/${poll.id}/vote`, { method: 'POST', token: getToken(), body: { option_id: optionId } })
      onChanged()
    } catch {
      setError('Could not record your vote.')
    } finally {
      setBusy(false)
    }
  }

  const handleAddOption = async (event) => {
    event.preventDefault()
    if (!newOption.trim()) return
    setBusy(true)
    try {
      await apiRequest(`/polls/${poll.id}/options`, { method: 'POST', token: getToken(), body: { label: newOption } })
      setNewOption('')
      onChanged()
    } catch {
      setError('Could not add that option.')
    } finally {
      setBusy(false)
    }
  }

  const handleClose = async () => {
    setBusy(true)
    try {
      await apiRequest(`/polls/${poll.id}/close`, { method: 'POST', token: getToken() })
      onChanged()
    } catch {
      setError('Could not close this poll.')
    } finally {
      setBusy(false)
    }
  }

  const handleReopen = async () => {
    setBusy(true)
    try {
      await apiRequest(`/polls/${poll.id}/reopen`, { method: 'POST', token: getToken() })
      onChanged()
    } catch {
      setError('Could not reopen this poll.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="poll-card">
      <div className="poll-card__header">
        <strong>{poll.question}</strong>
        {isClosed && <span className="poll-card__closed-tag">Closed</span>}
      </div>

      <div className="poll-card__options">
        {poll.options.map((option) => (
          <div key={option.id} className="poll-card__option-row">
            <button
              type="button"
              className={`poll-card__option ${option.voted_by_me ? 'poll-card__option--voted' : ''}`}
              onClick={() => handleVote(option.id)}
              disabled={busy || isClosed || !isMember}
            >
              <span>{option.label}</span>
              <span className="poll-card__vote-count">{option.vote_count}</span>
            </button>
            {option.voters?.length > 0 && (
              <p className="poll-card__voters">
                {option.voters.map((v) => `${v.first_name} ${v.last_name}`).join(', ')}
              </p>
            )}
          </div>
        ))}
      </div>

      {error && <p className="poll-card__error">{error}</p>}

      {!isClosed && isMember && (
        <>
          <form className="poll-card__add-option" onSubmit={handleAddOption}>
            <input
              type="text"
              placeholder="Add an option…"
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
            />
            <Button type="submit" variant="secondary" disabled={busy || !newOption.trim()}>
              Add
            </Button>
          </form>
          <Button variant="secondary" onClick={handleClose} disabled={busy}>
            Close poll
          </Button>
        </>
      )}

      {isClosed && isMember && (
        <Button variant="secondary" onClick={handleReopen} disabled={busy}>
          Reopen poll
        </Button>
      )}
    </div>
  )
}

export default PollCard

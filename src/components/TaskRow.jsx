import { useState } from 'react'
import StatusBadge from './StatusBadge.jsx'
import { Button, Modal, FormField } from './ui'
import { apiRequest } from '../lib/api.js'
import { getToken } from '../lib/session.js'
import './TaskRow.css'

// prd.md §4.5 — assignment select offers "Not assigned" / "Assign to me" /
// any other current project member; reassignment reuses the same control.
function TaskRow({ task, projectMembers, currentUser, isMember, onChanged }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [resolveOpen, setResolveOpen] = useState(false)
  const [resolution, setResolution] = useState('')
  const [resolveError, setResolveError] = useState('')
  const [linkTitle, setLinkTitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkError, setLinkError] = useState('')

  const isResolved = task.status === 'resolved'

  const handleAssign = async (event) => {
    const value = event.target.value || null
    setBusy(true)
    try {
      await apiRequest(`/tasks/${task.id}/assign`, { method: 'PATCH', token: getToken(), body: { assigned_to: value } })
      onChanged()
    } catch {
      setError('Could not update the assignee.')
    } finally {
      setBusy(false)
    }
  }

  const handleStatus = async (event) => {
    setBusy(true)
    try {
      await apiRequest(`/tasks/${task.id}/status`, { method: 'PATCH', token: getToken(), body: { status: event.target.value } })
      onChanged()
    } catch {
      setError('Could not update the status.')
    } finally {
      setBusy(false)
    }
  }

  const handleResolve = async (event) => {
    event.preventDefault()
    setResolveError('')
    if (!resolution.trim()) {
      setResolveError('Describe what was resolved.')
      return
    }
    setBusy(true)
    try {
      await apiRequest(`/tasks/${task.id}/resolve`, { method: 'POST', token: getToken(), body: { resolution } })
      setResolveOpen(false)
      setResolution('')
      onChanged()
    } catch {
      setResolveError('Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const handleAddLink = async (event) => {
    event.preventDefault()
    setLinkError('')
    setBusy(true)
    try {
      await apiRequest(`/tasks/${task.id}/links`, { method: 'POST', token: getToken(), body: { title: linkTitle, url: linkUrl } })
      setLinkTitle('')
      setLinkUrl('')
      onChanged()
    } catch (err) {
      setLinkError(err.data?.error === 'invalid_url' ? 'That URL doesn\'t look valid.' : 'Could not add that link.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="task-row">
      <div className="task-row__header">
        <strong>{task.name}</strong>
        <StatusBadge status={task.status} />
      </div>
      {task.description && <p className="task-row__description">{task.description}</p>}

      {!isResolved && isMember && (
        <div className="task-row__controls">
          <select value={task.assigned_to?.id || ''} onChange={handleAssign} disabled={busy}>
            <option value="">Not assigned</option>
            {currentUser && <option value={currentUser.id}>Assign to me</option>}
            {projectMembers
              .filter((m) => m.id !== currentUser?.id)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.first_name} {m.last_name}
                </option>
              ))}
          </select>
          <select value={task.status} onChange={handleStatus} disabled={busy}>
            <option value="not_started">Not started</option>
            <option value="underway">Underway</option>
          </select>
          <Button variant="secondary" onClick={() => setResolveOpen(true)} disabled={busy}>
            Resolve
          </Button>
        </div>
      )}

      {!isResolved && !isMember && (
        <p className="task-row__readonly-meta">
          {task.assigned_to
            ? `Assigned to ${task.assigned_to.first_name} ${task.assigned_to.last_name}`
            : 'Not assigned'}
        </p>
      )}

      {isResolved && (
        <div className="task-row__resolution">
          <strong>What was resolved:</strong> {task.resolution}
          <div className="task-row__resolution-meta">
            {task.assigned_to && (
              <>
                Assigned to {task.assigned_to.first_name} {task.assigned_to.last_name} ·{' '}
              </>
            )}
            Resolved by {task.resolved_by?.first_name} {task.resolved_by?.last_name} on{' '}
            {new Date(task.resolved_at).toLocaleDateString()}
          </div>
        </div>
      )}

      {error && <p className="task-row__error">{error}</p>}

      <div className="task-row__links">
        {task.links.map((link) => (
          <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="task-row__link">
            {link.title}
          </a>
        ))}
        {isMember && (
          <form className="task-row__add-link" onSubmit={handleAddLink}>
            <input
              type="text"
              placeholder="Link title"
              value={linkTitle}
              onChange={(e) => setLinkTitle(e.target.value)}
            />
            <input
              type="text"
              placeholder="https://…"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
            />
            <Button type="submit" variant="secondary" disabled={busy || !linkTitle || !linkUrl}>
              + Add link
            </Button>
          </form>
        )}
        {linkError && <p className="task-row__error">{linkError}</p>}
      </div>

      <Modal open={resolveOpen} onClose={() => setResolveOpen(false)} title="Resolve this task">
        <form onSubmit={handleResolve}>
          <FormField label="What was resolved?" htmlFor={`resolution-${task.id}`}>
            <textarea
              id={`resolution-${task.id}`}
              rows={3}
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              autoFocus
            />
          </FormField>
          {resolveError && <p className="task-row__error">{resolveError}</p>}
          <div className="task-row__modal-actions">
            <Button type="button" variant="secondary" onClick={() => setResolveOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              Mark resolved
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default TaskRow

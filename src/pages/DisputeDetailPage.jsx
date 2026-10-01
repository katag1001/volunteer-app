import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { PageShell, Card, Button, FormField, Modal } from '../components/ui'
import DisputeStatusBadge from '../components/DisputeStatusBadge.jsx'
import { apiRequest } from '../lib/api.js'
import { fetchSession, getToken } from '../lib/session.js'
import { DISPUTE_TYPE_LABELS, formatDisputeDate, pickedUpByName } from '../lib/disputes.js'
import './DisputeDetailPage.css'

// A 409 means someone else changed the dispute's status since this page
// loaded (e.g. picked it up first) — reload it so the buttons match reality.
const ERROR_MESSAGES = {
  already_picked_up: 'Someone else has already picked this up.',
  not_underway: 'This dispute is no longer underway.',
  not_resolved: 'This dispute is no longer resolved.',
  forbidden: 'Only the person who picked this up, or an admin, can do that.',
}

function DisputeDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [dispute, setDispute] = useState(null)
  const [session, setSession] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState(false)
  const [resolveOpen, setResolveOpen] = useState(false)
  const [resolutionNotes, setResolutionNotes] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([apiRequest(`/disputes/${id}`, { token: getToken() }), fetchSession()])
      .then(([data, sessionData]) => {
        if (cancelled) return
        setDispute(data.dispute)
        setSession(sessionData)
      })
      .catch((err) => {
        if (cancelled) return
        setLoadError(err.status === 404 ? 'That dispute does not exist.' : 'Could not load this dispute.')
      })
    return () => {
      cancelled = true
    }
  }, [id])

  // Back to wherever the user came from (keeps the board's tab), or to the
  // board itself if this page was opened directly.
  const handleBack = () => {
    if (location.key !== 'default') navigate(-1)
    else navigate('/disputes')
  }

  const runAction = async (action, body) => {
    setActionError('')
    setBusy(true)
    try {
      const data = await apiRequest(`/disputes/${id}/${action}`, { method: 'POST', token: getToken(), body })
      setDispute(data.dispute)
      return true
    } catch (err) {
      setActionError(ERROR_MESSAGES[err.data?.error] || 'Something went wrong. Please try again.')
      if (err.status === 409) {
        apiRequest(`/disputes/${id}`, { token: getToken() })
          .then((data) => setDispute(data.dispute))
          .catch(() => {})
      }
      return false
    } finally {
      setBusy(false)
    }
  }

  const openResolve = () => {
    setResolutionNotes(dispute.resolution_notes)
    setResolveOpen(true)
  }

  const handleResolve = async (event) => {
    event.preventDefault()
    if (await runAction('resolve', { resolution_notes: resolutionNotes })) setResolveOpen(false)
  }

  const isPicker = !!dispute?.picked_up_by && dispute.picked_up_by.id === session?.user?.id
  const canManage = isPicker || session?.state === 'admin'

  return (
    <PageShell>
      <Button variant="ghost" className="dispute-detail__back" onClick={handleBack}>
        ← Back
      </Button>

      {loadError && <p className="dispute-detail__error">{loadError}</p>}
      {!dispute && !loadError && <p>Loading…</p>}

      {dispute && (
        <>
          <div className="dispute-detail__header">
            <h1>{DISPUTE_TYPE_LABELS[dispute.type]}</h1>
            <DisputeStatusBadge status={dispute.status} />
          </div>

          <Card className="dispute-detail">
            <div className="dispute-detail__actions">
              {dispute.status === 'new' && (
                <Button onClick={() => runAction('pick-up')} disabled={busy}>
                  Pick up
                </Button>
              )}
              {dispute.status === 'underway' && canManage && (
                <>
                  <Button onClick={openResolve} disabled={busy}>
                    Resolve
                  </Button>
                  <Button variant="secondary" onClick={() => runAction('unpick')} disabled={busy}>
                    Undo pick up
                  </Button>
                </>
              )}
              {dispute.status === 'resolved' && canManage && (
                <Button variant="secondary" onClick={() => runAction('reopen')} disabled={busy}>
                  Reopen
                </Button>
              )}
            </div>

            {actionError && <p className="dispute-detail__error">{actionError}</p>}

            <dl className="dispute-detail__fields">
              <dt>Type</dt>
              <dd>{DISPUTE_TYPE_LABELS[dispute.type]}</dd>
              <dt>Status</dt>
              <dd>
                <DisputeStatusBadge status={dispute.status} />
              </dd>
              <dt>Date raised</dt>
              <dd>{formatDisputeDate(dispute.date_raised)}</dd>
              <dt>Picked up by</dt>
              <dd>{pickedUpByName(dispute)}</dd>
              <dt>Order no</dt>
              <dd>{dispute.order_no || '—'}</dd>
              <dt>User no</dt>
              <dd>{dispute.user_no || '—'}</dd>
              <dt>Details</dt>
              <dd className="dispute-detail__text">{dispute.details || '—'}</dd>
              <dt>Resolution notes</dt>
              <dd className="dispute-detail__text">{dispute.resolution_notes || '—'}</dd>
            </dl>
          </Card>

          <Modal open={resolveOpen} onClose={() => setResolveOpen(false)} title="Resolve dispute">
            <form className="dispute-detail__form" onSubmit={handleResolve}>
              <FormField label="Resolution notes" htmlFor="resolution-notes">
                <textarea
                  id="resolution-notes"
                  rows={5}
                  autoFocus
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                />
              </FormField>
              {actionError && <p className="dispute-detail__error">{actionError}</p>}
              <div className="dispute-detail__modal-actions">
                <Button type="button" variant="secondary" onClick={() => setResolveOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? 'Resolving…' : 'Resolve'}
                </Button>
              </div>
            </form>
          </Modal>
        </>
      )}
    </PageShell>
  )
}

export default DisputeDetailPage

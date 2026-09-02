import { useEffect, useState } from 'react'
import { Button, Modal } from '../../components/ui'
import { apiRequest } from '../../lib/api.js'
import { getToken } from '../../lib/session.js'

function ApprovalsPanel() {
  const [users, setUsers] = useState(null)
  const [error, setError] = useState('')
  const [rejectTarget, setRejectTarget] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const load = () => {
    apiRequest('/admin/pending-users', { token: getToken() })
      .then((data) => setUsers(data.users))
      .catch(() => setError('Could not load pending signups.'))
  }

  useEffect(load, [])

  const handleApprove = async (user) => {
    setBusyId(user.id)
    try {
      await apiRequest(`/admin/users/${user.id}/approve`, { method: 'POST', token: getToken() })
      setUsers((prev) => prev.filter((u) => u.id !== user.id))
    } catch {
      setError('Could not approve that user.')
    } finally {
      setBusyId(null)
    }
  }

  const handleReject = async () => {
    const user = rejectTarget
    setRejectTarget(null)
    setBusyId(user.id)
    try {
      await apiRequest(`/admin/users/${user.id}/reject`, { method: 'POST', token: getToken() })
      setUsers((prev) => prev.filter((u) => u.id !== user.id))
    } catch {
      setError('Could not reject that user.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <p className="admin-card__intro">Members who've verified their email and are waiting to be approved.</p>

      {error && <p className="admin-card__error">{error}</p>}

      {users === null && <p>Loading…</p>}
      {users?.length === 0 && <p>Nothing pending right now.</p>}

      {users?.map((user) => (
        <div key={user.id} className="admin-row">
          <div>
            <strong>{user.first_name} {user.last_name}</strong>
            <div className="admin-row__meta">{user.email}</div>
          </div>
          <div className="admin-row__actions">
            <Button onClick={() => handleApprove(user)} disabled={busyId === user.id}>
              Approve
            </Button>
            <Button variant="danger" onClick={() => setRejectTarget(user)} disabled={busyId === user.id}>
              Reject
            </Button>
          </div>
        </div>
      ))}

      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title="Reject this signup?">
        <p>
          This deletes {rejectTarget?.first_name}'s account immediately. They can sign up again
          afterward if they want to.
        </p>
        <div className="admin-modal__actions">
          <Button variant="secondary" onClick={() => setRejectTarget(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleReject}>
            Reject account
          </Button>
        </div>
      </Modal>
    </>
  )
}

export default ApprovalsPanel

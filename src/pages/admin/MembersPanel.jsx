import { useEffect, useState } from 'react'
import { Button, Modal } from '../../components/ui'
import { apiRequest } from '../../lib/api.js'
import { getToken } from '../../lib/session.js'

function MembersPanel() {
  const [users, setUsers] = useState(null)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const load = () => {
    apiRequest('/admin/users', { token: getToken() })
      .then((data) => setUsers(data.users))
      .catch(() => setError('Could not load members.'))
  }

  useEffect(load, [])

  const handleToggleAdmin = async (user) => {
    setBusyId(user.id)
    try {
      const data = await apiRequest(`/admin/users/${user.id}/admin-status`, {
        method: 'PATCH',
        token: getToken(),
        body: { is_admin: !user.is_admin },
      })
      setUsers((prev) => prev.map((u) => (u.id === user.id ? data.user : u)))
    } catch {
      setError("Could not update that member's admin status.")
    } finally {
      setBusyId(null)
    }
  }

  const handleToggleKeyPlayer = async (user) => {
    setBusyId(user.id)
    try {
      const data = await apiRequest(`/admin/users/${user.id}/key-player`, {
        method: 'PATCH',
        token: getToken(),
        body: { is_key_player: !user.is_key_player },
      })
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_key_player: data.profile.is_key_player } : u))
      )
    } catch {
      setError("Could not update that member's key-player status.")
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async () => {
    const user = deleteTarget
    setDeleteTarget(null)
    setBusyId(user.id)
    try {
      await apiRequest(`/admin/users/${user.id}`, { method: 'DELETE', token: getToken() })
      setUsers((prev) => prev.filter((u) => u.id !== user.id))
    } catch {
      setError('Could not delete that member.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <p className="admin-card__intro">Set key players, admin or remove any member's account.</p>

      {error && <p className="admin-card__error">{error}</p>}

      {users === null && <p>Loading…</p>}
      {users?.length === 0 && <p>No members yet.</p>}

      {users?.map((user) => (
        <div key={user.id} className="admin-row">
          <div>
            <strong>{user.first_name} {user.last_name}</strong>
            {user.is_seed_admin && <span className="admin-badge">Seed admin</span>}
            {!user.is_seed_admin && user.is_admin && <span className="admin-badge">Admin</span>}
            {user.is_key_player && <span className="admin-badge admin-badge--key-player">Key player</span>}
            <div className="admin-row__meta">{user.email}</div>
          </div>
          <div className="admin-row__actions">
            <Button
              variant="secondary"
              onClick={() => handleToggleKeyPlayer(user)}
              disabled={busyId === user.id}
            >
              {user.is_key_player ? 'Unset key player' : 'Set key player'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleToggleAdmin(user)}
              disabled={busyId === user.id || user.is_seed_admin}
            >
              {user.is_admin ? 'Unset Admin' : 'Set Admin'}
            </Button>
            <Button
              variant="danger"
              onClick={() => setDeleteTarget(user)}
              disabled={busyId === user.id || user.is_seed_admin}
            >
              Delete
            </Button>
          </div>
        </div>
      ))}

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete this account?">
        <p>
          This permanently deletes {deleteTarget?.first_name} {deleteTarget?.last_name}'s account.
          Are you sure?
        </p>
        <div className="admin-modal__actions">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete account
          </Button>
        </div>
      </Modal>
    </>
  )
}

export default MembersPanel

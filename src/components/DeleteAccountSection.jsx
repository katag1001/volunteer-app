import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Modal, FormField } from './ui'
import { apiRequest } from '../lib/api.js'
import { clearToken, getToken } from '../lib/session.js'
import './DeleteAccountSection.css'

const ERROR_MESSAGES = {
  invalid_password: "That password doesn't match.",
  password_required: 'Enter your password to confirm.',
}

// prd.md §3.6 — self-delete, gated by re-entering your password.
function DeleteAccountSection() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const close = () => {
    setOpen(false)
    setPassword('')
    setError('')
  }

  const handleDelete = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await apiRequest('/account/me', { method: 'DELETE', token: getToken(), body: { password } })
      clearToken()
      navigate('/login', { replace: true })
    } catch (err) {
      setError(ERROR_MESSAGES[err.data?.error] || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="delete-account-section">
      <h2>Delete account</h2>
      <p>This permanently deletes your account. This can't be undone.</p>
      <Button variant="danger" onClick={() => setOpen(true)}>
        Delete my account
      </Button>

      <Modal open={open} onClose={close} title="Delete your account?">
        <form onSubmit={handleDelete}>
          <p>Enter your password to confirm. This can't be undone.</p>
          <FormField label="Password" htmlFor="delete-password">
            <input
              id="delete-password"
              type="password"
              required
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </FormField>
          {error && <p className="delete-account-section__error">{error}</p>}
          <div className="delete-account-section__actions">
            <Button type="button" variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" disabled={submitting}>
              {submitting ? 'Deleting…' : 'Delete my account'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default DeleteAccountSection

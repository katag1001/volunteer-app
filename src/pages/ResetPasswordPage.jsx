import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageShell, Card, Button, FormField } from '../components/ui'
import { apiRequest } from '../lib/api.js'
import './AuthPages.css'

const ERROR_MESSAGES = {
  password_too_short: 'Password must be at least 8 characters.',
}

function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('form') // form | done | error
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await apiRequest('/auth/reset-password', { method: 'POST', body: { token, password } })
      setStatus('done')
    } catch (err) {
      if (err.status === 410) {
        setError('This link has expired. Please request a new one.')
      } else if (err.data?.error === 'invalid_link') {
        setError("This link isn't valid. Please request a new one.")
      } else {
        setError(ERROR_MESSAGES[err.data?.error] || 'Something went wrong. Please try again.')
      }
      setStatus('error')
    } finally {
      setSubmitting(false)
    }
  }

  if (!token) {
    return (
      <PageShell>
        <Card className="holding-card">
          <h1>Invalid reset link</h1>
          <p>This link is missing its token. Please use the link from your email.</p>
          <p>
            <Link to="/forgot-password">Request a new link</Link>
          </p>
        </Card>
      </PageShell>
    )
  }

  if (status === 'done') {
    return (
      <PageShell>
        <Card className="holding-card">
          <h1>Password updated</h1>
          <p>You can log in with your new password now.</p>
          <p>
            <Link to="/login">Log in</Link>
          </p>
        </Card>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <Card className="auth-card" as="form" onSubmit={handleSubmit}>
        <h1>Set a new password</h1>

        <FormField label="New password" htmlFor="password" hint="At least 8 characters.">
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </FormField>

        {error && <p className="auth-card__error">{error}</p>}
        {status === 'error' && (
          <p className="auth-card__footer">
            <Link to="/forgot-password">Request a new link</Link>
          </p>
        )}

        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Set new password'}
        </Button>
      </Card>
    </PageShell>
  )
}

export default ResetPasswordPage

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageShell, Card, Button, FormField } from '../components/ui'
import { apiRequest } from '../lib/api.js'
import './AuthPages.css'

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      await apiRequest('/auth/forgot-password', { method: 'POST', body: { email } })
    } finally {
      // Always show the same outcome, whether or not the email matched an
      // account — the backend responds identically either way on purpose.
      setSubmitting(false)
      setSubmitted(true)
    }
  }

  if (submitted) {
    return (
      <PageShell>
        <Card className="holding-card">
          <h1>Check your inbox</h1>
          <p>If an account exists for {email}, we've sent a link to reset your password.</p>
          <p>
            <Link to="/login">Back to log in</Link>
          </p>
        </Card>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <Card className="auth-card" as="form" onSubmit={handleSubmit}>
        <h1>Forgot your password?</h1>
        <p className="auth-card__intro">Enter your email and we'll send you a reset link.</p>

        <FormField label="Email" htmlFor="email">
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </FormField>

        <Button type="submit" disabled={submitting}>
          {submitting ? 'Sending…' : 'Send reset link'}
        </Button>

        <p className="auth-card__footer">
          <Link to="/login">Back to log in</Link>
        </p>
      </Card>
    </PageShell>
  )
}

export default ForgotPasswordPage

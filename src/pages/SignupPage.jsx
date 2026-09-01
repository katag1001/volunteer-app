import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { PageShell, Card, Button, FormField } from '../components/ui'
import { apiRequest } from '../lib/api.js'
import './AuthPages.css'

const ERROR_MESSAGES = {
  email_taken: "That email's already registered.",
  password_too_short: 'Password must be at least 8 characters.',
  invalid_email: 'That email address doesn’t look right.',
  missing_fields: 'Please fill in every field.',
}

function SignupPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', first_name: '', last_name: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const updateField = (field) => (event) => setForm({ ...form, [field]: event.target.value })

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await apiRequest('/auth/signup', { method: 'POST', body: form })
      navigate('/check-inbox', { state: { email: form.email } })
    } catch (err) {
      setError(ERROR_MESSAGES[err.data?.error] || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageShell>
      <Card className="auth-card" as="form" onSubmit={handleSubmit}>
        <h1>Join Cherry</h1>
        <p className="auth-card__intro">Create your account to get started.</p>

        <FormField label="First name" htmlFor="first_name">
          <input id="first_name" type="text" required value={form.first_name} onChange={updateField('first_name')} />
        </FormField>
        <FormField label="Last name" htmlFor="last_name">
          <input id="last_name" type="text" required value={form.last_name} onChange={updateField('last_name')} />
        </FormField>
        <FormField label="Email" htmlFor="email">
          <input id="email" type="email" required value={form.email} onChange={updateField('email')} />
        </FormField>
        <FormField label="Password" htmlFor="password" hint="At least 8 characters.">
          <input id="password" type="password" required value={form.password} onChange={updateField('password')} />
        </FormField>

        {error && <p className="auth-card__error">{error}</p>}

        <Button type="submit" disabled={submitting}>
          {submitting ? 'Signing up…' : 'Sign up'}
        </Button>

        <p className="auth-card__footer">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </Card>
    </PageShell>
  )
}

export default SignupPage

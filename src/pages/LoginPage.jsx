import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { PageShell, Card, Button, FormField } from '../components/ui'
import { apiRequest } from '../lib/api.js'
import { setToken } from '../lib/session.js'
import './AuthPages.css'

function LoginPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const updateField = (field) => (event) => setForm({ ...form, [field]: event.target.value })

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const data = await apiRequest('/auth/login', { method: 'POST', body: form })
      setToken(data.token)
      navigate('/')
    } catch (err) {
      if (err.data?.error === 'unverified') {
        navigate('/check-inbox', { state: { email: form.email } })
      } else if (err.data?.error === 'unapproved') {
        navigate('/waiting-approval')
      } else {
        setError('Incorrect email or password.')
      }
      setSubmitting(false)
    }
  }

  return (
    <PageShell>
      <Card className="auth-card" as="form" onSubmit={handleSubmit}>
        <h1>Log in</h1>

        <FormField label="Email" htmlFor="email">
          <input id="email" type="email" required value={form.email} onChange={updateField('email')} />
        </FormField>
        <FormField label="Password" htmlFor="password">
          <input id="password" type="password" required value={form.password} onChange={updateField('password')} />
        </FormField>

        {error && <p className="auth-card__error">{error}</p>}

        <Button type="submit" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Log in'}
        </Button>

        <p className="auth-card__footer">
          Need an account? <Link to="/signup">Sign up</Link>
        </p>
        <p className="auth-card__footer">
          <Link to="/forgot-password">Forgot your password?</Link>
        </p>
      </Card>
    </PageShell>
  )
}

export default LoginPage

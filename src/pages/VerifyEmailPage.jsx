import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { PageShell, Card } from '../components/ui'
import { apiRequest } from '../lib/api.js'
import './AuthPages.css'

function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()
  const [status, setStatus] = useState(token ? 'verifying' : 'missing_token')

  useEffect(() => {
    if (!token) return

    let cancelled = false
    apiRequest('/auth/verify-email', { method: 'POST', body: { token } })
      .then((data) => {
        if (cancelled) return
        if (data.autoApproved) {
          setStatus('auto_approved')
        } else {
          navigate('/waiting-approval', { replace: true })
        }
      })
      .catch((err) => {
        if (cancelled) return
        setStatus(err.status === 410 ? 'expired' : 'invalid')
      })

    return () => {
      cancelled = true
    }
  }, [token, navigate])

  return (
    <PageShell>
      <Card className="holding-card">
        {status === 'verifying' && <p>Verifying your email…</p>}

        {status === 'missing_token' && (
          <>
            <h1>Invalid verification link</h1>
            <p>This link is missing its token. Please use the link from your email.</p>
          </>
        )}

        {status === 'invalid' && (
          <>
            <h1>Invalid verification link</h1>
            <p>This link isn't valid. Please use the link from your verification email.</p>
          </>
        )}

        {status === 'expired' && (
          <>
            <h1>This link has expired</h1>
            <p>Verification links expire after 3 days. Please sign up again.</p>
            <p>
              <Link to="/signup">Sign up</Link>
            </p>
          </>
        )}

        {status === 'auto_approved' && (
          <>
            <h1>You're verified and approved</h1>
            <p>You're the admin — no waiting required. You can log in now.</p>
            <p>
              <Link to="/login">Log in</Link>
            </p>
          </>
        )}
      </Card>
    </PageShell>
  )
}

export default VerifyEmailPage

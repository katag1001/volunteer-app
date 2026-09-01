import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { PageShell, Card, Button } from '../components/ui'
import { fetchSession, clearToken, getToken } from '../lib/session.js'
import { apiRequest } from '../lib/api.js'
import './HomePage.css'

function HomePage() {
  const navigate = useNavigate()
  const [session, setSession] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetchSession()
      .then(async (data) => {
        if (cancelled) return
        if (data.state === 'unverified') return navigate('/check-inbox', { replace: true })
        if (data.state === 'unapproved') return navigate('/waiting-approval', { replace: true })
        if (data.state === 'active' || data.state === 'admin') {
          const { profile } = await apiRequest('/profile/me', { token: getToken() })
          if (!cancelled && profile.teams.length === 0) {
            return navigate('/complete-profile', { replace: true })
          }
        }
        if (!cancelled) setSession(data)
      })
      .catch(() => !cancelled && setSession({ state: 'signed_out', user: null }))
    return () => {
      cancelled = true
    }
  }, [navigate])

  const handleLogOut = () => {
    clearToken()
    setSession({ state: 'signed_out', user: null })
  }

  if (!session) {
    return (
      <PageShell>
        <Card className="home-card">Loading…</Card>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <Card className="home-card">
        <h1>Cherry Volunteer Organiser</h1>

        {session.state === 'signed_out' && (
          <>
            <p>Sign up or log in to get started.</p>
            <div className="home-card__actions">
              <Link to="/signup">
                <Button>Sign up</Button>
              </Link>
              <Link to="/login">
                <Button variant="secondary">Log in</Button>
              </Link>
            </div>
          </>
        )}

        {(session.state === 'active' || session.state === 'admin') && (
          <>
            <p>
              Welcome back, {session.user.first_name}
              {session.state === 'admin' ? ' (admin)' : ''}.
            </p>
            <div className="home-card__actions">
              <Link to="/projects">
                <Button variant="secondary">Projects</Button>
              </Link>
              <Link to="/directory">
                <Button variant="secondary">Directory</Button>
              </Link>
              <Link to="/profile">
                <Button variant="secondary">My profile</Button>
              </Link>
              {session.state === 'admin' && (
                <>
                  <Link to="/admin/approvals">
                    <Button variant="secondary">Approvals</Button>
                  </Link>
                  <Link to="/admin/users">
                    <Button variant="secondary">Members</Button>
                  </Link>
                </>
              )}
            </div>
            <Button variant="secondary" onClick={handleLogOut}>
              Log out
            </Button>
          </>
        )}
      </Card>
    </PageShell>
  )
}

export default HomePage

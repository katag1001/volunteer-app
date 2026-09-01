import { Link, useLocation } from 'react-router-dom'
import { PageShell, Card } from '../components/ui'
import './AuthPages.css'

function CheckInboxPage() {
  const location = useLocation()
  const email = location.state?.email

  return (
    <PageShell>
      <Card className="holding-card">
        <h1>Check your inbox</h1>
        <p>
          We've sent a verification link{email ? ` to ${email}` : ''}. Click it to verify your
          email — the link expires in 3 days.
        </p>
        <p>
          Already verified? <Link to="/login">Log in</Link>
        </p>
      </Card>
    </PageShell>
  )
}

export default CheckInboxPage

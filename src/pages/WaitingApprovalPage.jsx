import { Link } from 'react-router-dom'
import { PageShell, Card } from '../components/ui'
import './AuthPages.css'

function WaitingApprovalPage() {
  return (
    <PageShell>
      <Card className="holding-card">
        <h1>Waiting for admin approval</h1>
        <p>
          Your email is verified. An admin needs to approve your account before you can log in —
          check back soon.
        </p>
        <p>
          <Link to="/login">Try logging in</Link>
        </p>
      </Card>
    </PageShell>
  )
}

export default WaitingApprovalPage

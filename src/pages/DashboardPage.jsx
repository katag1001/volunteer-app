import { useEffect, useState } from 'react'
import { PageShell } from '../components/ui'
import { fetchSession } from '../lib/session.js'
import './DashboardPage.css'

// Placeholder homescreen while the app is being rebuilt — the old
// projects/issues/tasks dashboard was removed along with those features.
function DashboardPage() {
  const [session, setSession] = useState(null)

  useEffect(() => {
    fetchSession().then(setSession).catch(() => {})
  }, [])

  return (
    <PageShell>
      <h1>{session ? `Welcome back, ${session.user.first_name}` : 'Welcome back'}</h1>
      <p className="dashboard-page__intro">There's nothing here yet.</p>
    </PageShell>
  )
}

export default DashboardPage

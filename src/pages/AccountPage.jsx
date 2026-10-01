import { useEffect, useState } from 'react'
import { PageShell, Card } from '../components/ui'
import DeleteAccountSection from '../components/DeleteAccountSection.jsx'
import { fetchSession } from '../lib/session.js'
import './AccountPage.css'

// Account details plus self-delete — what's left of the old profile page
// now that UserProfile has been removed.
function AccountPage() {
  const [user, setUser] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchSession()
      .then((data) => setUser(data.user))
      .catch(() => setError('Could not load your account.'))
  }, [])

  return (
    <PageShell>
      <h1>Your account</h1>
      <Card className="account-page">
        {error && <p>{error}</p>}
        {!user && !error && <p>Loading…</p>}
        {user && (
          <>
            <dl className="account-page__details">
              <dt>Name</dt>
              <dd>
                {user.first_name} {user.last_name}
              </dd>
              <dt>Email</dt>
              <dd>{user.email}</dd>
            </dl>
            {/* prd.md §3.3 — the seed admin can never be deleted, so don't offer it. */}
            {!user.is_seed_admin && <DeleteAccountSection />}
          </>
        )}
      </Card>
    </PageShell>
  )
}

export default AccountPage

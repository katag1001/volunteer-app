import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageShell, Card } from '../components/ui'
import ProfileForm from '../components/ProfileForm.jsx'
import { apiRequest } from '../lib/api.js'
import { getToken } from '../lib/session.js'
import './ProfilePages.css'

function CompleteProfilePage() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    apiRequest('/profile/me', { token: getToken() })
      .then((data) => setProfile(data.profile))
      .catch(() => setError('Could not load your profile.'))
  }, [])

  if (error) {
    return (
      <PageShell>
        <Card className="profile-page">{error}</Card>
      </PageShell>
    )
  }
  if (!profile) {
    return (
      <PageShell>
        <Card className="profile-page">Loading…</Card>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <Card className="profile-page">
        <h1>Complete your profile</h1>
        <p className="profile-page__intro">
          Just a few details so the rest of the team can find and get to know you.
        </p>
        <ProfileForm initialProfile={profile} submitLabel="Finish" onSaved={() => navigate('/')} />
      </Card>
    </PageShell>
  )
}

export default CompleteProfilePage

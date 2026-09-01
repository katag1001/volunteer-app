import { useEffect, useState } from 'react'
import { PageShell, Card } from '../components/ui'
import ProfileForm from '../components/ProfileForm.jsx'
import DeleteAccountSection from '../components/DeleteAccountSection.jsx'
import { apiRequest } from '../lib/api.js'
import { getToken, fetchSession } from '../lib/session.js'
import './ProfilePages.css'

function EditProfilePage() {
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')
  const [savedAt, setSavedAt] = useState(null)
  const [isSeedAdmin, setIsSeedAdmin] = useState(false)

  useEffect(() => {
    apiRequest('/profile/me', { token: getToken() })
      .then((data) => setProfile(data.profile))
      .catch(() => setError('Could not load your profile.'))
    fetchSession().then((data) => setIsSeedAdmin(!!data.user?.is_seed_admin))
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
        <h1>Your profile</h1>
        {savedAt && <p className="profile-page__saved">Saved.</p>}
        <ProfileForm
          initialProfile={profile}
          onSaved={(updated) => {
            setProfile(updated)
            setSavedAt(Date.now())
          }}
        />
        {!isSeedAdmin && <DeleteAccountSection />}
      </Card>
    </PageShell>
  )
}

export default EditProfilePage

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchSession } from '../lib/session.js'

const REDIRECT_FOR_STATE = {
  signed_out: '/login',
  unverified: '/check-inbox',
  unapproved: '/waiting-approval',
}

// Guards routes (profile pages) that any active member/admin can reach, but
// no one earlier in the lifecycle can — redirects to whichever holding
// screen actually matches their current state, same as LoginPage does.
function RequireActiveMember({ children }) {
  const navigate = useNavigate()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchSession()
      .then((data) => {
        if (cancelled) return
        if (data.state === 'active' || data.state === 'admin') {
          setChecked(true)
        } else {
          navigate(REDIRECT_FOR_STATE[data.state] || '/login', { replace: true })
        }
      })
      .catch(() => !cancelled && navigate('/login', { replace: true }))
    return () => {
      cancelled = true
    }
  }, [navigate])

  return checked ? children : null
}

export default RequireActiveMember

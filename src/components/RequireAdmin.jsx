import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchSession } from '../lib/session.js'

// build-plan.md Phase A3 — "route guard so non-admins can't reach either
// page." The backend enforces this too (requireAdmin on every /admin/*
// route); this just avoids flashing admin UI at a non-admin before the
// first API call 403s.
function RequireAdmin({ children }) {
  const navigate = useNavigate()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchSession()
      .then((data) => {
        if (cancelled) return
        if (data.state === 'admin') {
          setChecked(true)
        } else {
          navigate('/', { replace: true })
        }
      })
      .catch(() => !cancelled && navigate('/', { replace: true }))
    return () => {
      cancelled = true
    }
  }, [navigate])

  return checked ? children : null
}

export default RequireAdmin

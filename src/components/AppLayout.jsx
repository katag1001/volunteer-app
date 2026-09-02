import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { clearToken, fetchSession, getToken } from '../lib/session.js'
import { apiRequest } from '../lib/api.js'
import './AppLayout.css'

function titleClass({ isActive }) {
  return `app-nav__title${isActive ? ' app-nav__title--active' : ''}`
}

function linkClass({ isActive }) {
  return `app-nav__link${isActive ? ' app-nav__link--active' : ''}`
}

// Persistent side nav + content column for every logged-in page, per the
// homepage/nav overhaul — replaces HomePage's old "homepage is the nav"
// pattern. Mounted once at the layout-route level so it doesn't refetch on
// every in-app navigation; each page renders into the <Outlet/> below.
function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [session, setSession] = useState(null)
  const [myProjects, setMyProjects] = useState([])
  const [pendingApprovals, setPendingApprovals] = useState(0)

  // /admin's two sidebar entries both point at the one route with a
  // different ?tab=, so NavLink's pathname-only active check can't tell
  // them apart — work out which one matches by hand.
  const activeAdminTab =
    location.pathname === '/admin' ? new URLSearchParams(location.search).get('tab') || 'approvals' : null
  const adminLinkClass = (tab) => `app-nav__link${activeAdminTab === tab ? ' app-nav__link--active' : ''}`

  useEffect(() => {
    fetchSession().then(setSession).catch(() => {})
  }, [])

  useEffect(() => {
    apiRequest('/profile/me/dashboard', { token: getToken() })
      .then((data) => setMyProjects(data.projects))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (session?.state !== 'admin') return
    apiRequest('/admin/pending-users/count', { token: getToken() })
      .then((data) => setPendingApprovals(data.count))
      .catch(() => {})
  }, [session])

  const handleLogOut = () => {
    clearToken()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-layout">
      <nav className="app-nav">
        <div className="app-nav__brand">Cherry Volunteer Organiser</div>

        <div className="app-nav__scroll">
          <div className="app-nav__section">
            <NavLink to="/" end className={titleClass}>
              Home
            </NavLink>
          </div>

          <div className="app-nav__section">
            <NavLink to="/profile" className={titleClass}>
              My profile
            </NavLink>
          </div>

          <div className="app-nav__section">
            <NavLink to="/projects" end className={titleClass}>
              Projects
            </NavLink>
            {myProjects.map((project) => (
              <NavLink key={project.id} to={`/projects/${project.id}`} className={linkClass}>
                {project.title}
              </NavLink>
            ))}
          </div>

          <div className="app-nav__section">
            <NavLink to="/directory" className={titleClass}>
              Directory
            </NavLink>
          </div>

          {session?.state === 'admin' && (
            <div className="app-nav__section">
              <NavLink to="/admin?tab=approvals" className={titleClass}>
                Admin
              </NavLink>
              <Link to="/admin?tab=approvals" className={adminLinkClass('approvals')}>
                Approvals
                {pendingApprovals > 0 && <span className="app-nav__badge">{pendingApprovals}</span>}
              </Link>
              <Link to="/admin?tab=members" className={adminLinkClass('members')}>
                Members
              </Link>
            </div>
          )}
        </div>

        <button type="button" className="app-nav__logout" onClick={handleLogOut}>
          Log out
        </button>
      </nav>

      <div className="app-layout__content">
        <Outlet />
      </div>
    </div>
  )
}

export default AppLayout

import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { PageShell, Card } from '../components/ui'
import StatusBadge from '../components/StatusBadge.jsx'
import { fetchSession, getToken } from '../lib/session.js'
import { apiRequest } from '../lib/api.js'
import './DashboardPage.css'

const STAGES = [
  { key: 'not_started', label: 'Not started' },
  { key: 'underway', label: 'Underway' },
  { key: 'resolved', label: 'Resolved' },
]

function groupByStage(items) {
  const groups = { not_started: [], underway: [], resolved: [] }
  for (const item of items) {
    groups[item.status]?.push(item)
  }
  return groups
}

function DashboardSection({ title, emptyText, items, renderItem }) {
  const grouped = groupByStage(items)
  return (
    <Card className="dashboard-section">
      <h2>{title}</h2>
      {items.length === 0 && <p className="dashboard-section__empty">{emptyText}</p>}
      {STAGES.map(({ key }) =>
        grouped[key].length > 0 ? (
          <div key={key} className="dashboard-stage">
            <div className="dashboard-stage__label">
              <StatusBadge status={key} />
            </div>
            <div className="dashboard-stage__list">{grouped[key].map(renderItem)}</div>
          </div>
        ) : null
      )}
    </Card>
  )
}

// The new homescreen (prd.md predates this; see the nav overhaul) — a
// dashboard of everything the current user is associated with: projects
// they belong to, issues they're a member of, and tasks assigned to them,
// grouped by stage. Replaces the old HomePage, which was just a list of nav
// buttons.
function DashboardPage() {
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchSession()
      .then(async (result) => {
        if (cancelled) return
        if (result.state === 'unverified') return navigate('/check-inbox', { replace: true })
        if (result.state === 'unapproved') return navigate('/waiting-approval', { replace: true })
        const { profile } = await apiRequest('/profile/me', { token: getToken() })
        if (cancelled) return
        if (profile.teams.length === 0) return navigate('/complete-profile', { replace: true })
        setSession(result)
      })
      .catch(() => !cancelled && navigate('/login', { replace: true }))
    return () => {
      cancelled = true
    }
  }, [navigate])

  useEffect(() => {
    if (!session) return
    apiRequest('/profile/me/dashboard', { token: getToken() })
      .then(setData)
      .catch(() => setError('Could not load your dashboard.'))
  }, [session])

  if (!session) {
    return (
      <PageShell>
        <p>Loading…</p>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <h1>Welcome back, {session.user.first_name}</h1>
      {error && <p className="dashboard-page__error">{error}</p>}
      {!data && !error && <p>Loading…</p>}
      {data && (
        <div className="dashboard-grid">
          <DashboardSection
            title="Projects"
            emptyText="You're not part of any projects yet."
            items={data.projects}
            renderItem={(project) => (
              <Link key={project.id} to={`/projects/${project.id}`} className="dashboard-item">
                {project.title}
              </Link>
            )}
          />
          <DashboardSection
            title="Issues"
            emptyText="No issues you're involved in yet."
            items={data.issues}
            renderItem={(issue) => (
              <Link key={issue.id} to={`/projects/${issue.project_id}?issue=${issue.id}`} className="dashboard-item">
                <span>{issue.title}</span>
                <span className="dashboard-item__meta">{issue.project_title}</span>
              </Link>
            )}
          />
          <DashboardSection
            title="Tasks"
            emptyText="No tasks assigned to you yet."
            items={data.tasks}
            renderItem={(task) => (
              <Link key={task.id} to={`/projects/${task.project_id}?issue=${task.issue_id}`} className="dashboard-item">
                <span>{task.name}</span>
                <span className="dashboard-item__meta">
                  {task.project_title} · {task.issue_title}
                </span>
              </Link>
            )}
          />
        </div>
      )}
    </PageShell>
  )
}

export default DashboardPage

import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom'
import { PageShell, Card, Button, Modal, FormField } from '../components/ui'
import StatusBadge from '../components/StatusBadge.jsx'
import IssueCard from '../components/IssueCard.jsx'
import { apiRequest } from '../lib/api.js'
import { getToken, fetchSession } from '../lib/session.js'
import { MASTER_TEAM_LIST } from '../lib/skillTeams.js'
import './ProjectDetailPage.css'

const DELETE_PHRASE = 'delete project'

function ProjectDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const targetIssueId = searchParams.get('issue')
  const [project, setProject] = useState(null)
  const [issues, setIssues] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [error, setError] = useState('')
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteText, setDeleteText] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [addIssueOpen, setAddIssueOpen] = useState(false)
  const [issueTitle, setIssueTitle] = useState('')
  const [issueDescription, setIssueDescription] = useState('')
  const [issueError, setIssueError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    apiRequest(`/projects/${id}`, { token: getToken() })
      .then((data) => setProject(data.project))
      .catch(() => setError('Could not load this project.'))
  }, [id])

  const loadIssues = useCallback(() => {
    apiRequest(`/projects/${id}/issues`, { token: getToken() })
      .then((data) => setIssues(data.issues))
      .catch(() => setError('Could not load issues.'))
  }, [id])

  useEffect(() => {
    load()
    loadIssues()
  }, [load, loadIssues])

  useEffect(() => {
    fetchSession().then((data) => setCurrentUser(data.user))
  }, [])

  const handleAddIssue = async (event) => {
    event.preventDefault()
    setIssueError('')
    setBusy(true)
    try {
      await apiRequest(`/projects/${id}/issues`, { method: 'POST', token: getToken(), body: { title: issueTitle, description: issueDescription } })
      setAddIssueOpen(false)
      setIssueTitle('')
      setIssueDescription('')
      loadIssues()
      load() // project status may have changed
    } catch (err) {
      setIssueError(err.data?.error === 'title_required' ? 'Give the issue a title.' : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const handleJoin = async () => {
    setBusy(true)
    try {
      await apiRequest(`/projects/${id}/join`, { method: 'POST', token: getToken() })
      load()
    } catch {
      setError('Could not join this project.')
    } finally {
      setBusy(false)
    }
  }

  const handleLeave = async () => {
    setLeaveConfirmOpen(false)
    setBusy(true)
    try {
      await apiRequest(`/projects/${id}/leave`, { method: 'POST', token: getToken() })
      navigate('/projects')
    } catch {
      setError('Could not leave this project.')
      setBusy(false)
    }
  }

  const toggleTeam = async (team) => {
    setBusy(true)
    try {
      if (project.teams.includes(team)) {
        await apiRequest(`/projects/${id}/teams`, { method: 'DELETE', token: getToken(), body: { team } })
      } else {
        await apiRequest(`/projects/${id}/teams`, { method: 'POST', token: getToken(), body: { team } })
      }
      load()
    } catch {
      setError('Could not update team tags.')
    } finally {
      setBusy(false)
    }
  }

  const handleSetContact = async (event) => {
    const userId = event.target.value || null
    setBusy(true)
    try {
      await apiRequest(`/projects/${id}/contact`, { method: 'PATCH', token: getToken(), body: { user_id: userId } })
      load()
    } catch {
      setError('Could not update the contact.')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (event) => {
    event.preventDefault()
    setDeleteError('')
    if (deleteText !== DELETE_PHRASE) {
      setDeleteError(`Type "${DELETE_PHRASE}" exactly to confirm.`)
      return
    }
    setBusy(true)
    try {
      await apiRequest(`/projects/${id}`, { method: 'DELETE', token: getToken(), body: { confirmText: deleteText } })
      navigate('/projects')
    } catch {
      setDeleteError('Something went wrong.')
      setBusy(false)
    }
  }

  if (error && !project) {
    return (
      <PageShell>
        <Card className="project-detail">{error}</Card>
      </PageShell>
    )
  }
  if (!project) {
    return (
      <PageShell>
        <Card className="project-detail">Loading…</Card>
      </PageShell>
    )
  }

  return (
    <PageShell>
              <h1>
          <Link to="/projects" className="project-detail__crumb">
            Projects
          </Link>
        </h1>
      <Card className="project-detail">


        <div className="project-detail__header">
          <h2>{project.title}</h2>
          <StatusBadge status={project.status} />
        </div>

        {project.description && <p>{project.description}</p>}

        <p className="project-detail__meta">
          Contact: {project.contact ? `${project.contact.first_name} ${project.contact.last_name}` : 'None set'}
          {' · '}
          {project.members.length} member{project.members.length === 1 ? '' : 's'}
        </p>

        {project.teams.length > 0 && (
          <div className="project-detail__tags">
            {project.teams.map((team) => (
              <span key={team} className="project-detail__tag">
                {team}
              </span>
            ))}
          </div>
        )}

        {error && <p className="project-detail__error">{error}</p>}

        {!project.is_member && (
          <Button onClick={handleJoin} disabled={busy}>
            Join project
          </Button>
        )}

        <div className="project-detail__section">
          <div className="project-detail__section-header">
            <h2>Issues</h2>
            {project.is_member && (
              <Button variant="secondary" onClick={() => setAddIssueOpen(true)}>
                + Add issue
              </Button>
            )}
          </div>
          {issues === null && <p>Loading…</p>}
          {issues?.length === 0 && <p>No issues yet.</p>}
          {issues?.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              projectMembers={project.members}
              currentUser={currentUser}
              isMember={project.is_member}
              onChanged={loadIssues}
              autoExpand={issue.id === targetIssueId}
            />
          ))}
        </div>

        {project.is_member && (
          <>
            <div className="project-detail__section">
              <h2>Team tags</h2>
              <div className="project-detail__team-grid">
                {MASTER_TEAM_LIST.map((team) => (
                  <label key={team} className="project-detail__checkbox">
                    <input
                      type="checkbox"
                      checked={project.teams.includes(team)}
                      disabled={busy}
                      onChange={() => toggleTeam(team)}
                    />
                    {team}
                  </label>
                ))}
              </div>
            </div>

            <div className="project-detail__section">
              <h2>Members</h2>
              <ul className="project-detail__member-list">
                {project.members.map((member) => (
                  <li key={member.id}>
                    {member.first_name} {member.last_name}
                    {member.role === 'contact' && <span className="project-detail__contact-tag">Contact</span>}
                  </li>
                ))}
              </ul>
              <FormField label="Reassign contact">
                <select value={project.contact?.id || ''} onChange={handleSetContact} disabled={busy}>
                  <option value="">No contact</option>
                  {project.members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.first_name} {member.last_name}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <div className="project-detail__actions">
              <Button variant="secondary" onClick={() => setLeaveConfirmOpen(true)} disabled={busy}>
                Leave project
              </Button>
              {project.status === 'resolved' && (
                <Button variant="danger" onClick={() => setDeleteOpen(true)} disabled={busy}>
                  Delete project
                </Button>
              )}
            </div>
          </>
        )}
      </Card>

      <Modal open={addIssueOpen} onClose={() => setAddIssueOpen(false)} title="New issue">
        <form onSubmit={handleAddIssue}>
          <FormField label="Title" htmlFor="issue-title">
            <input id="issue-title" type="text" required value={issueTitle} onChange={(e) => setIssueTitle(e.target.value)} />
          </FormField>
          <FormField label="Description" htmlFor="issue-description">
            <textarea
              id="issue-description"
              rows={3}
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
            />
          </FormField>
          {issueError && <p className="project-detail__error">{issueError}</p>}
          <div className="project-detail__modal-actions">
            <Button type="button" variant="secondary" onClick={() => setAddIssueOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Creating…' : 'Add issue'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={leaveConfirmOpen} onClose={() => setLeaveConfirmOpen(false)} title="Leave this project?">
        <p>Are you sure you want to leave {project.title}?</p>
        <div className="project-detail__modal-actions">
          <Button variant="secondary" onClick={() => setLeaveConfirmOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleLeave}>
            Leave project
          </Button>
        </div>
      </Modal>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete this project?">
        <form onSubmit={handleDelete}>
          <p>
            This permanently deletes {project.title} and everything in it. Type "{DELETE_PHRASE}" to confirm.
          </p>
          <FormField label={`Type "${DELETE_PHRASE}"`} htmlFor="delete-confirm">
            <input
              id="delete-confirm"
              type="text"
              autoFocus
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
            />
          </FormField>
          {deleteError && <p className="project-detail__error">{deleteError}</p>}
          <div className="project-detail__modal-actions">
            <Button type="button" variant="secondary" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" disabled={busy}>
              Delete project
            </Button>
          </div>
        </form>
      </Modal>
    </PageShell>
  )
}

export default ProjectDetailPage

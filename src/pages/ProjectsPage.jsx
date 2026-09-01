import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageShell, Card, Button, Modal, FormField } from '../components/ui'
import StatusBadge from '../components/StatusBadge.jsx'
import { apiRequest } from '../lib/api.js'
import { getToken } from '../lib/session.js'
import './ProjectsPage.css'

function ProjectsPage() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState(null)
  const [error, setError] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [createError, setCreateError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = () => {
    apiRequest('/projects', { token: getToken() })
      .then((data) => setProjects(data.projects))
      .catch(() => setError('Could not load projects.'))
  }

  useEffect(load, [])

  const handleCreate = async (event) => {
    event.preventDefault()
    setCreateError('')
    setSubmitting(true)
    try {
      const data = await apiRequest('/projects', { method: 'POST', token: getToken(), body: { title, description } })
      navigate(`/projects/${data.project.id}`)
    } catch (err) {
      setCreateError(err.data?.error === 'title_required' ? 'Give the project a title.' : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageShell>
      <Card className="projects-card">
        <div className="projects-card__header">
          <h1>Projects</h1>
          <Button onClick={() => setCreateOpen(true)}>+ New project</Button>
        </div>

        {error && <p className="projects-card__error">{error}</p>}
        {projects === null && !error && <p>Loading…</p>}
        {projects?.length === 0 && <p>No projects yet — start one!</p>}

        <div className="projects-grid">
          {projects?.map((project) => (
            <button
              key={project.id}
              type="button"
              className="project-card"
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <div className="project-card__title">{project.title}</div>
              <StatusBadge status={project.status} />
              <div className="project-card__meta">
                {project.member_count} member{project.member_count === 1 ? '' : 's'} ·{' '}
                {project.issue_count} issue{project.issue_count === 1 ? '' : 's'} ·{' '}
                {project.task_count} task{project.task_count === 1 ? '' : 's'}
              </div>
            </button>
          ))}
        </div>
      </Card>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New project">
        <form onSubmit={handleCreate}>
          <FormField label="Title" htmlFor="project-title">
            <input id="project-title" type="text" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </FormField>
          <FormField label="Description" htmlFor="project-description">
            <textarea
              id="project-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </FormField>
          {createError && <p className="projects-card__error">{createError}</p>}
          <div className="projects-modal__actions">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create project'}
            </Button>
          </div>
        </form>
      </Modal>
    </PageShell>
  )
}

export default ProjectsPage

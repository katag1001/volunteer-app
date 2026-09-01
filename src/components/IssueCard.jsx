import { useState } from 'react'
import StatusBadge from './StatusBadge.jsx'
import TaskRow from './TaskRow.jsx'
import PollCard from './PollCard.jsx'
import { Button, Modal, FormField } from './ui'
import { apiRequest } from '../lib/api.js'
import { getToken } from '../lib/session.js'
import './IssueCard.css'

// prd.md §4.4 — "clicking expands it in place": no navigation, just a
// local expand/collapse. Full detail (description, people, tasks) is
// lazy-loaded only when first expanded, same lazy-detail pattern as
// DirectoryPage.
function IssueCard({ issue, projectMembers, currentUser, isMember, onChanged }) {
  const [expanded, setExpanded] = useState(false)
  const [detail, setDetail] = useState(null)
  const [tasks, setTasks] = useState(null)
  const [polls, setPolls] = useState(null)
  const [error, setError] = useState('')
  const [addSelection, setAddSelection] = useState('')
  const [busy, setBusy] = useState(false)
  const [addTaskOpen, setAddTaskOpen] = useState(false)
  const [taskName, setTaskName] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [taskAssignee, setTaskAssignee] = useState('')
  const [taskError, setTaskError] = useState('')
  const [addPollOpen, setAddPollOpen] = useState(false)
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOptionInputs, setPollOptionInputs] = useState(['', ''])
  const [pollError, setPollError] = useState('')

  const loadDetail = () => {
    apiRequest(`/issues/${issue.id}`, { token: getToken() })
      .then((data) => setDetail(data.issue))
      .catch(() => setError('Could not load this issue.'))
  }

  const loadTasks = () => {
    apiRequest(`/issues/${issue.id}/tasks`, { token: getToken() })
      .then((data) => setTasks(data.tasks))
      .catch(() => setError('Could not load tasks.'))
  }

  const loadPolls = () => {
    apiRequest(`/issues/${issue.id}/polls`, { token: getToken() })
      .then((data) => setPolls(data.polls))
      .catch(() => setError('Could not load polls.'))
  }

  const toggle = () => {
    const next = !expanded
    setExpanded(next)
    if (next && !detail) {
      loadDetail()
      loadTasks()
      loadPolls()
    }
  }

  const handleAddPerson = async () => {
    if (!addSelection) return
    setBusy(true)
    try {
      await apiRequest(`/issues/${issue.id}/members`, { method: 'POST', token: getToken(), body: { user_id: addSelection } })
      setAddSelection('')
      loadDetail()
      onChanged?.()
    } catch {
      setError('Could not add that person.')
    } finally {
      setBusy(false)
    }
  }

  const handleRemovePerson = async (userId) => {
    setBusy(true)
    try {
      await apiRequest(`/issues/${issue.id}/members/${userId}`, { method: 'DELETE', token: getToken() })
      loadDetail()
      onChanged?.()
    } catch {
      setError('Could not remove that person.')
    } finally {
      setBusy(false)
    }
  }

  const handleAddTask = async (event) => {
    event.preventDefault()
    setTaskError('')
    setBusy(true)
    try {
      await apiRequest(`/issues/${issue.id}/tasks`, {
        method: 'POST',
        token: getToken(),
        body: { name: taskName, description: taskDescription, assigned_to: taskAssignee || null },
      })
      setAddTaskOpen(false)
      setTaskName('')
      setTaskDescription('')
      setTaskAssignee('')
      loadTasks()
      onChanged?.()
    } catch (err) {
      setTaskError(err.data?.error === 'name_required' ? 'Give the task a name.' : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const refreshTasksAndCounts = () => {
    loadTasks()
    onChanged?.()
  }

  const updatePollOptionInput = (index, value) => {
    setPollOptionInputs((prev) => prev.map((v, i) => (i === index ? value : v)))
  }

  const handleAddPoll = async (event) => {
    event.preventDefault()
    setPollError('')
    const cleanOptions = pollOptionInputs.map((o) => o.trim()).filter(Boolean)
    if (cleanOptions.length === 0) {
      setPollError('Add at least one option.')
      return
    }
    setBusy(true)
    try {
      await apiRequest(`/issues/${issue.id}/polls`, {
        method: 'POST',
        token: getToken(),
        body: { question: pollQuestion, options: cleanOptions },
      })
      setAddPollOpen(false)
      setPollQuestion('')
      setPollOptionInputs(['', ''])
      loadPolls()
      onChanged?.()
    } catch (err) {
      setPollError(err.data?.error === 'question_required' ? 'Give the poll a question.' : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const addableMembers = detail
    ? projectMembers.filter((m) => !detail.members.some((dm) => dm.id === m.id))
    : []

  return (
    <div className="issue-card">
      <button type="button" className="issue-card__summary" onClick={toggle}>
        <span className="issue-card__title">{issue.title}</span>
        <span className="issue-card__meta">
          <StatusBadge status={issue.status} />
          <span>
            {issue.task_resolved} of {issue.task_total} tasks
          </span>
          <span>
            {issue.people_count} pers{issue.people_count === 1 ? 'on' : 'ons'}
          </span>
        </span>
      </button>

      {expanded && (
        <div className="issue-card__body">
          {error && <p className="issue-card__error">{error}</p>}
          {!detail && !error && <p>Loading…</p>}
          {detail && (
            <>
              {detail.description && <p>{detail.description}</p>}

              <div className="issue-card__people">
                <strong>People</strong>
                <ul className="issue-card__people-list">
                  {detail.members.map((member) => (
                    <li key={member.id}>
                      {member.first_name} {member.last_name}
                      {isMember && (
                        <button type="button" onClick={() => handleRemovePerson(member.id)} disabled={busy}>
                          ×
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
                {isMember && addableMembers.length > 0 && (
                  <div className="issue-card__add-person">
                    <select value={addSelection} onChange={(e) => setAddSelection(e.target.value)}>
                      <option value="">Add person…</option>
                      {addableMembers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.first_name} {m.last_name}
                        </option>
                      ))}
                    </select>
                    <Button variant="secondary" onClick={handleAddPerson} disabled={busy || !addSelection}>
                      Add
                    </Button>
                  </div>
                )}
              </div>

              <div className="issue-card__tasks">
                <div className="issue-card__tasks-header">
                  <strong>Tasks</strong>
                  {isMember && (
                    <Button variant="secondary" onClick={() => setAddTaskOpen(true)}>
                      + Add task
                    </Button>
                  )}
                </div>
                {tasks === null && <p>Loading…</p>}
                {tasks?.length === 0 && <p>No tasks yet.</p>}
                {tasks?.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    projectMembers={projectMembers}
                    currentUser={currentUser}
                    isMember={isMember}
                    onChanged={refreshTasksAndCounts}
                  />
                ))}
              </div>

              <div className="issue-card__polls">
                <div className="issue-card__tasks-header">
                  <strong>Polls</strong>
                  {isMember && (
                    <Button variant="secondary" onClick={() => setAddPollOpen(true)}>
                      + Add poll
                    </Button>
                  )}
                </div>
                {polls === null && <p>Loading…</p>}
                {polls?.length === 0 && <p>No polls yet.</p>}
                {polls?.map((poll) => (
                  <PollCard key={poll.id} poll={poll} isMember={isMember} onChanged={loadPolls} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <Modal open={addTaskOpen} onClose={() => setAddTaskOpen(false)} title="New task">
        <form onSubmit={handleAddTask}>
          <FormField label="Name" htmlFor={`task-name-${issue.id}`}>
            <input
              id={`task-name-${issue.id}`}
              type="text"
              required
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
            />
          </FormField>
          <FormField label="Description" htmlFor={`task-desc-${issue.id}`}>
            <textarea
              id={`task-desc-${issue.id}`}
              rows={2}
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
            />
          </FormField>
          <FormField label="Assign to">
            <select value={taskAssignee} onChange={(e) => setTaskAssignee(e.target.value)}>
              <option value="">Not assigned</option>
              {currentUser && <option value={currentUser.id}>Assign to me</option>}
              {projectMembers
                .filter((m) => m.id !== currentUser?.id)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.first_name} {m.last_name}
                  </option>
                ))}
            </select>
          </FormField>
          {taskError && <p className="issue-card__error">{taskError}</p>}
          <div className="issue-card__modal-actions">
            <Button type="button" variant="secondary" onClick={() => setAddTaskOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Adding…' : 'Add task'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={addPollOpen} onClose={() => setAddPollOpen(false)} title="New poll">
        <form onSubmit={handleAddPoll}>
          <FormField label="Question" htmlFor={`poll-question-${issue.id}`}>
            <input
              id={`poll-question-${issue.id}`}
              type="text"
              required
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
            />
          </FormField>
          <FormField label="Options">
            {pollOptionInputs.map((value, index) => (
              // eslint-disable-next-line react/no-array-index-key
              <input
                key={index}
                type="text"
                placeholder={`Option ${index + 1}`}
                value={value}
                onChange={(e) => updatePollOptionInput(index, e.target.value)}
                className="issue-card__poll-option-input"
              />
            ))}
          </FormField>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setPollOptionInputs((prev) => [...prev, ''])}
          >
            + Add another option
          </Button>
          {pollError && <p className="issue-card__error">{pollError}</p>}
          <div className="issue-card__modal-actions">
            <Button type="button" variant="secondary" onClick={() => setAddPollOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Creating…' : 'Add poll'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default IssueCard

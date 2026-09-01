import './StatusBadge.css'

const LABELS = {
  not_started: 'Not started',
  underway: 'Underway',
  resolved: 'Resolved',
}

function StatusBadge({ status }) {
  return <span className={`status-badge status-badge--${status}`}>{LABELS[status] || status}</span>
}

export default StatusBadge

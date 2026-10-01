import { DISPUTE_STATUS_LABELS } from '../lib/disputes.js'
import './DisputeStatusBadge.css'

function DisputeStatusBadge({ status }) {
  return <span className={`dispute-status dispute-status--${status}`}>{DISPUTE_STATUS_LABELS[status] ?? status}</span>
}

export default DisputeStatusBadge

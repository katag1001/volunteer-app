import { useState } from 'react'
import { Button, FormField, Modal } from './ui'
import { apiRequest } from '../lib/api.js'
import { getToken } from '../lib/session.js'
import { DISPUTE_TYPE_LABELS } from '../lib/disputes.js'

const EMPTY_FORM = { type: '', order_no: '', user_no: '', details: '' }

// Temporary — a stand-in for however disputes will eventually arrive, so
// the board can be tested by hand. Delete this file (and its button on
// DisputesPage) once that exists.
function AddDisputeModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const updateField = (field) => (event) => setForm({ ...form, [field]: event.target.value })

  const close = () => {
    setForm(EMPTY_FORM)
    setError('')
    onClose()
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const data = await apiRequest('/disputes', { method: 'POST', token: getToken(), body: form })
      onCreated(data.dispute)
      close()
    } catch {
      setError('Could not add that dispute.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={close} title="Add dispute">
      <form className="disputes-form" onSubmit={handleSubmit}>
        <FormField label="Type" htmlFor="dispute-type">
          <select id="dispute-type" required value={form.type} onChange={updateField('type')}>
            <option value="" disabled>
              Choose a type
            </option>
            {Object.entries(DISPUTE_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Order no" htmlFor="dispute-order-no">
          <input id="dispute-order-no" type="text" value={form.order_no} onChange={updateField('order_no')} />
        </FormField>
        <FormField label="User no" htmlFor="dispute-user-no">
          <input id="dispute-user-no" type="text" value={form.user_no} onChange={updateField('user_no')} />
        </FormField>
        <FormField label="Details" htmlFor="dispute-details">
          <textarea id="dispute-details" rows={4} value={form.details} onChange={updateField('details')} />
        </FormField>

        {error && <p className="disputes-page__error">{error}</p>}

        <div className="disputes-modal__actions">
          <Button type="button" variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Adding…' : 'Add dispute'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default AddDisputeModal

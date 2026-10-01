import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageShell, Card, Button } from '../components/ui'
import DisputeStatusBadge from '../components/DisputeStatusBadge.jsx'
import AddDisputeModal from '../components/AddDisputeModal.jsx'
import { apiRequest } from '../lib/api.js'
import { getToken } from '../lib/session.js'
import { DISPUTE_TYPE_LABELS, formatDisputeDate, pickedUpByName } from '../lib/disputes.js'
import './DisputesPage.css'

const TABS = [
  { key: 'all', label: 'All disputes' },
  { key: 'mine', label: 'My disputes' },
]

// New and underway put the longest-waiting dispute on top; resolved shows
// the most recent first.
const COLUMNS = [
  { status: 'new', label: 'New', newestFirst: false },
  { status: 'underway', label: 'Underway', newestFirst: false },
  { status: 'resolved', label: 'Resolved', newestFirst: true },
]

function sortedColumn(disputes, { status, newestFirst }) {
  const direction = newestFirst ? -1 : 1
  return disputes
    .filter((dispute) => dispute.status === status)
    .sort((a, b) => direction * (new Date(a.date_raised) - new Date(b.date_raised)))
}

// Kanban board of every dispute (or just the caller's, via ?tab=mine — the
// sidebar's two Disputes links preselect the tab the same way /admin does).
function DisputesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const activeTab = TABS.some((tab) => tab.key === requestedTab) ? requestedTab : 'all'

  // Tagged with the tab it was loaded for, so switching tabs shows
  // "Loading…" rather than the previous tab's board until the fetch lands.
  const [loaded, setLoaded] = useState({ tab: null, disputes: null, error: '' })
  const [addOpen, setAddOpen] = useState(false)
  const isCurrent = loaded.tab === activeTab
  const disputes = isCurrent ? loaded.disputes : null
  const error = isCurrent ? loaded.error : ''

  useEffect(() => {
    let cancelled = false
    apiRequest(activeTab === 'mine' ? '/disputes?mine=true' : '/disputes', { token: getToken() })
      .then((data) => !cancelled && setLoaded({ tab: activeTab, disputes: data.disputes, error: '' }))
      .catch(() => !cancelled && setLoaded({ tab: activeTab, disputes: null, error: 'Could not load disputes.' }))
    return () => {
      cancelled = true
    }
  }, [activeTab])

  // A new dispute is never picked up, so it never belongs on "My disputes".
  const handleCreated = (dispute) => {
    setLoaded((prev) =>
      prev.tab === 'all' && prev.disputes ? { ...prev, disputes: [...prev.disputes, dispute] } : prev
    )
  }

  return (
    <PageShell>
      <div className="disputes-page__header">
        <h1>Disputes</h1>
        <Button onClick={() => setAddOpen(true)}>Add dispute</Button>
      </div>

      <Card className="disputes-card">
        <div className="disputes-tabs">
          {TABS.map((tab) => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? 'primary' : 'secondary'}
              onClick={() => setSearchParams({ tab: tab.key }, { replace: true })}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {error && <p className="disputes-page__error">{error}</p>}
        {!disputes && !error && <p>Loading…</p>}

        {disputes && (
          <div className="disputes-board">
            {COLUMNS.map((column) => {
              const items = sortedColumn(disputes, column)
              return (
                <section key={column.status} className="disputes-column">
                  <h2 className="disputes-column__title">
                    {column.label}
                    <span className="disputes-column__count">{items.length}</span>
                  </h2>
                  {items.length === 0 && <p className="disputes-column__empty">Nothing here.</p>}
                  {items.map((dispute) => (
                    <Link key={dispute.id} to={`/disputes/${dispute.id}`} className="dispute-card">
                      <div className="dispute-card__top">
                        <strong>{DISPUTE_TYPE_LABELS[dispute.type]}</strong>
                        <DisputeStatusBadge status={dispute.status} />
                      </div>
                      <div className="dispute-card__meta">{formatDisputeDate(dispute.date_raised)}</div>
                      <div className="dispute-card__meta">{pickedUpByName(dispute)}</div>
                    </Link>
                  ))}
                </section>
              )
            })}
          </div>
        )}
      </Card>

      <AddDisputeModal open={addOpen} onClose={() => setAddOpen(false)} onCreated={handleCreated} />
    </PageShell>
  )
}

export default DisputesPage

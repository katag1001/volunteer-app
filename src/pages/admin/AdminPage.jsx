import { useSearchParams } from 'react-router-dom'
import { PageShell, Card, Button } from '../../components/ui'
import ApprovalsPanel from './ApprovalsPanel.jsx'
import MembersPanel from './MembersPanel.jsx'
import './AdminPages.css'

const TABS = [
  { key: 'approvals', label: 'Approvals' },
  { key: 'members', label: 'Members' },
]

// Single admin page, toggled between its two panels instead of two separate
// routes — the sidebar's Approvals/Members links both land here and just
// preselect a tab via ?tab=, so they stay independently linkable.
function AdminPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const activeTab = TABS.some((tab) => tab.key === requestedTab) ? requestedTab : 'approvals'

  return (
    <PageShell>
      <h1>Admin</h1>
      <Card className="admin-card">
        <div className="admin-tabs">
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

        {activeTab === 'approvals' ? <ApprovalsPanel /> : <MembersPanel />}
      </Card>
    </PageShell>
  )
}

export default AdminPage

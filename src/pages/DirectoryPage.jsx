import { useEffect, useMemo, useState } from 'react'
import { PageShell, Card, Button, Modal } from '../components/ui'
import { apiRequest } from '../lib/api.js'
import { getToken } from '../lib/session.js'
import { MASTER_TEAM_LIST } from '../lib/skillTeams.js'
import { profilePictureSrc } from '../lib/profilePictures.js'
import './DirectoryPage.css'

function MemberAvatar({ member }) {
  const src = member.profile_picture && profilePictureSrc(member.profile_picture)
  if (src) return <img className="directory-avatar" src={src} alt="" />
  return (
    <div className="directory-avatar directory-avatar--placeholder">
      {member.first_name?.[0]?.toUpperCase()}
    </div>
  )
}

function DirectoryPage() {
  const [members, setMembers] = useState(null)
  const [error, setError] = useState('')
  const [keyPlayersOnly, setKeyPlayersOnly] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [selectedMemberId, setSelectedMemberId] = useState(null)
  const [memberDetail, setMemberDetail] = useState(null)
  const [memberDetailError, setMemberDetailError] = useState('')

  useEffect(() => {
    apiRequest('/directory/members', { token: getToken() })
      .then((data) => setMembers(data.members))
      .catch(() => setError('Could not load the directory.'))
  }, [])

  useEffect(() => {
    if (!selectedMemberId) return
    apiRequest(`/directory/members/${selectedMemberId}`, { token: getToken() })
      .then((data) => setMemberDetail(data.member))
      .catch(() => setMemberDetailError("Could not load this member's profile."))
  }, [selectedMemberId])

  const filteredMembers = useMemo(() => {
    if (!members) return []
    return members.filter(
      (m) => (!keyPlayersOnly || m.is_key_player) && (!selectedTeam || m.teams.includes(selectedTeam))
    )
  }, [members, keyPlayersOnly, selectedTeam])

  return (
    <PageShell>
      <h1>Directory</h1>
      <Card className="directory-card">

        <div className="directory-filters">
          <Button
            variant={keyPlayersOnly ? 'primary' : 'secondary'}
            onClick={() => setKeyPlayersOnly((v) => !v)}
          >
            Key players only
          </Button>
        </div>

        <hr className="directory-filters__divider" />

        <div className="directory-filters">
          {MASTER_TEAM_LIST.map((team) => (
            <Button
              key={team}
              variant={selectedTeam === team ? 'primary' : 'secondary'}
              onClick={() => setSelectedTeam((current) => (current === team ? null : team))}
            >
              {team}
            </Button>
          ))}
        </div>

        {error && <p className="directory-card__error">{error}</p>}
        {members === null && !error && <p>Loading…</p>}
        {members !== null && filteredMembers.length === 0 && <p>No members match these filters.</p>}

        <div className="directory-grid">
          {filteredMembers.map((member) => (
            <button
              key={member.id}
              type="button"
              className="directory-member-card"
              onClick={() => {
                setMemberDetail(null)
                setMemberDetailError('')
                setSelectedMemberId(member.id)
              }}
            >
              <MemberAvatar member={member} />
              <div className="directory-member-card__name">
                {member.first_name} {member.last_name}
              </div>
              {member.is_key_player && <span className="directory-badge">Key player</span>}
              {member.recently_active && <span className="directory-badge directory-badge--active">Recently active</span>}
            </button>
          ))}
        </div>
      </Card>

      <Modal
        open={!!selectedMemberId}
        onClose={() => setSelectedMemberId(null)}
        title={memberDetail ? `${memberDetail.first_name} ${memberDetail.last_name}` : 'Loading…'}
      >
        {!memberDetail && !memberDetailError && <p>Loading…</p>}
        {memberDetailError && <p className="directory-card__error">{memberDetailError}</p>}
        {memberDetail && (
          <div className="directory-detail">
            <MemberAvatar member={memberDetail} />
            <div className="directory-detail__badges">
              {memberDetail.is_key_player && <span className="directory-badge">Key player</span>}
              {memberDetail.recently_active && (
                <span className="directory-badge directory-badge--active">Recently active</span>
              )}
            </div>
            {memberDetail.about_me && <p>{memberDetail.about_me}</p>}
            {memberDetail.teams.length > 0 && (
              <div className="directory-detail__section">
                <strong>Teams</strong>
                <div className="directory-detail__tags">
                  {memberDetail.teams.map((t) => (
                    <span key={t} className="directory-tag">{t}</span>
                  ))}
                </div>
              </div>
            )}
            {memberDetail.skills.length > 0 && (
              <div className="directory-detail__section">
                <strong>Skills</strong>
                <div className="directory-detail__tags">
                  {memberDetail.skills.map((s) => (
                    <span key={s} className="directory-tag">{s}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="directory-detail__section">
              {memberDetail.email && (
                <p>
                  <a href={`mailto:${memberDetail.email}`}>{memberDetail.email}</a>
                </p>
              )}
              {memberDetail.slack_link && (
                <p>
                  <a href={memberDetail.slack_link} target="_blank" rel="noreferrer">
                    Slack
                  </a>
                </p>
              )}
            </div>
            <p className="directory-detail__since">
              Volunteering since {new Date(memberDetail.volunteer_since).toLocaleDateString()}
            </p>
          </div>
        )}
      </Modal>
    </PageShell>
  )
}

export default DirectoryPage

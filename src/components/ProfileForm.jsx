import { useRef, useState } from 'react'
import { Button, FormField } from './ui'
import { apiRequest } from '../lib/api.js'
import { getToken } from '../lib/session.js'
import skillTeams, { SKILL_LIST, MASTER_TEAM_LIST } from '../lib/skillTeams.js'
import { PROFILE_PICTURES } from '../lib/profilePictures.js'
import './ProfileForm.css'

const ABOUT_ME_MAX = 200

const ERROR_MESSAGES = {
  teams_required: 'Pick at least one team.',
  invalid_team: "One of the selected teams isn't valid.",
  about_me_too_long: `About me must be ${ABOUT_ME_MAX} characters or fewer.`,
  about_me_no_links: "About me can't contain links.",
  invalid_profile_picture: "That profile picture isn't a valid option.",
}

function ProfileForm({ initialProfile, onSaved, submitLabel = 'Save profile' }) {
  const [profilePicture, setProfilePicture] = useState(initialProfile.profile_picture)
  const [skills, setSkills] = useState(initialProfile.skills || [])
  const [otherSkillInput, setOtherSkillInput] = useState('')
  const [teams, setTeams] = useState(initialProfile.teams || [])
  const [emailVisible, setEmailVisible] = useState(initialProfile.email_visible)
  const [slackLink, setSlackLink] = useState(initialProfile.slack_link || '')
  const [slackVisible, setSlackVisible] = useState(initialProfile.slack_visible)
  const [aboutMe, setAboutMe] = useState(initialProfile.about_me || '')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // prd.md §3.5 — fires once, the very first time skills goes from empty to
  // one entry: suggest that skill's first mapped team, if it has one and
  // teams is still empty. Purely a client-side UX suggestion — the user is
  // free to remove/change it before saving. skill_prefill_used (persisted
  // server-side) prevents this from ever re-triggering, even across sessions.
  const prefillFiredRef = useRef(initialProfile.skill_prefill_used)

  const applySkillsChange = (next, currentTeams) => {
    if (!prefillFiredRef.current && skills.length === 0 && next.length === 1) {
      prefillFiredRef.current = true
      if (currentTeams.length === 0) {
        const mapped = skillTeams[next[0]]
        if (mapped && mapped.length > 0) {
          setTeams([mapped[0]])
        }
      }
    }
    setSkills(next)
  }

  const toggleSkill = (skill) => {
    const next = skills.includes(skill) ? skills.filter((s) => s !== skill) : [...skills, skill]
    applySkillsChange(next, teams)
  }

  const addOtherSkill = () => {
    const trimmed = otherSkillInput.trim()
    if (!trimmed || skills.includes(trimmed)) return
    applySkillsChange([...skills, trimmed], teams)
    setOtherSkillInput('')
  }

  const toggleTeam = (team) => {
    setTeams((prev) => (prev.includes(team) ? prev.filter((t) => t !== team) : [...prev, team]))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (teams.length === 0) {
      setError(ERROR_MESSAGES.teams_required)
      return
    }
    if (aboutMe.length > ABOUT_ME_MAX) {
      setError(ERROR_MESSAGES.about_me_too_long)
      return
    }
    if (/https?:\/\/|www\./i.test(aboutMe)) {
      setError(ERROR_MESSAGES.about_me_no_links)
      return
    }

    setSubmitting(true)
    try {
      const data = await apiRequest('/profile/me', {
        method: 'PUT',
        token: getToken(),
        body: {
          profile_picture: profilePicture,
          skills,
          teams,
          email_visible: emailVisible,
          slack_link: slackLink,
          slack_visible: slackVisible,
          about_me: aboutMe,
        },
      })
      onSaved(data.profile)
    } catch (err) {
      setError(ERROR_MESSAGES[err.data?.error] || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="profile-form" onSubmit={handleSubmit}>

      <FormField label="Profile picture">
        <div className="profile-form__picture-grid">
          {PROFILE_PICTURES.map((pic) => (
            <button
              type="button"
              key={pic.key}
              className={`profile-form__picture ${profilePicture === pic.key ? 'profile-form__picture--selected' : ''}`}
              onClick={() => setProfilePicture(pic.key)}
              aria-pressed={profilePicture === pic.key}
            >
              <img src={pic.src} alt={pic.label} />
            </button>
          ))}
        </div>
      </FormField>

      <FormField label="About me" hint={`${aboutMe.length}/${ABOUT_ME_MAX} characters, no links`}>
        <textarea
          rows={3}
          maxLength={ABOUT_ME_MAX}
          value={aboutMe}
          onChange={(e) => setAboutMe(e.target.value)}
          placeholder="What can people reach out to you about?"
        />
      </FormField>

      <FormField label="Skills">
        <div className="profile-form__checkbox-grid">
          {SKILL_LIST.map((skill) => (
            <label key={skill} className="profile-form__checkbox">
              <input type="checkbox" checked={skills.includes(skill)} onChange={() => toggleSkill(skill)} />
              {skill}
            </label>
          ))}
        </div>
        <div className="profile-form__other-row">
          <input
            type="text"
            placeholder="Other skill…"
            value={otherSkillInput}
            onChange={(e) => setOtherSkillInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addOtherSkill()
              }
            }}
          />
          <Button type="button" variant="secondary" onClick={addOtherSkill}>
            Add
          </Button>
        </div>
        {skills.filter((s) => !SKILL_LIST.includes(s)).length > 0 && (
          <div className="profile-form__tag-row">
            {skills
              .filter((s) => !SKILL_LIST.includes(s))
              .map((s) => (
                <span key={s} className="profile-form__tag">
                  {s}
                  <button type="button" onClick={() => applySkillsChange(skills.filter((x) => x !== s), teams)}>
                    ×
                  </button>
                </span>
              ))}
          </div>
        )}
      </FormField>

      <FormField label="Teams (required)">
        <div className="profile-form__checkbox-grid">
          {MASTER_TEAM_LIST.map((team) => (
            <label key={team} className="profile-form__checkbox">
              <input type="checkbox" checked={teams.includes(team)} onChange={() => toggleTeam(team)} />
              {team}
            </label>
          ))}
        </div>
      </FormField>

      <FormField label="Slack link">
        <input type="text" value={slackLink} onChange={(e) => setSlackLink(e.target.value)} placeholder="https://…" />
      </FormField>

      <div className="profile-form__toggles">
        <label className="profile-form__checkbox">
          <input type="checkbox" checked={emailVisible} onChange={(e) => setEmailVisible(e.target.checked)} />
          Show my email on my profile
        </label>
        <label className="profile-form__checkbox">
          <input type="checkbox" checked={slackVisible} onChange={(e) => setSlackVisible(e.target.checked)} />
          Show my Slack link on my profile
        </label>
      </div>

      {error && <p className="profile-form__error">{error}</p>}

      <Button type="submit" disabled={submitting}>
        {submitting ? 'Saving…' : submitLabel}
      </Button>
    </form>
  )
}

export default ProfileForm

import skillTeams from '../../config/skillTeams.json'

export const SKILL_LIST = Object.keys(skillTeams)

// prd.md §3.5 — the master team list is the de-duplicated union of every
// skill's mapped teams, computed here rather than stored anywhere.
export const MASTER_TEAM_LIST = [...new Set(Object.values(skillTeams).flat())].sort()

export default skillTeams

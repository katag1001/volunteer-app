const skillTeams = require('../../config/skillTeams.json')

function getMasterSkillList() {
  return Object.keys(skillTeams)
}

// prd.md §3.5 — the master team list is the de-duplicated union of every
// skill's mapped teams, computed at point of use rather than stored.
function getMasterTeamList() {
  return [...new Set(Object.values(skillTeams).flat())].sort()
}

module.exports = { skillTeams, getMasterSkillList, getMasterTeamList }

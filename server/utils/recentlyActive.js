// prd.md §3.1 — recency is never stored, only computed live wherever a
// profile is rendered: last_login within the last 3 days => "Recently active".
const RECENTLY_ACTIVE_MS = 3 * 24 * 60 * 60 * 1000

function isRecentlyActive(lastLogin) {
  return !!lastLogin && Date.now() - new Date(lastLogin).getTime() <= RECENTLY_ACTIVE_MS
}

module.exports = { isRecentlyActive }

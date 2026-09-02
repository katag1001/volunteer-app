// Thin fetch wrapper: JSON in/out, optional bearer token, and errors that
// carry the parsed body + status so callers can branch on error codes like
// 'unverified' / 'unapproved' / 'email_taken' returned by the API.
//
// Requests go to a relative /api path rather than an absolute URL: in
// production the frontend and API are served from the same Vercel domain, and
// in dev the Vite server proxies /api to the local Express server (see
// vite.config.js), so no environment-specific base URL is needed either way.
export async function apiRequest(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const error = new Error(data.error || 'request_failed')
    error.status = res.status
    error.data = data
    throw error
  }

  return data
}

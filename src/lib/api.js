export const API_URL = 'http://localhost:4444'

// Thin fetch wrapper: JSON in/out, optional bearer token, and errors that
// carry the parsed body + status so callers can branch on error codes like
// 'unverified' / 'unapproved' / 'email_taken' returned by the API.
export async function apiRequest(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
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

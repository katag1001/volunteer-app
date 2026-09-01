import { apiRequest } from './api.js'

const TOKEN_KEY = 'cherry_session_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

// { state: 'signed_out' | 'unverified' | 'unapproved' | 'active' | 'admin', user }
export function fetchSession() {
  return apiRequest('/auth/session', { token: getToken() })
}

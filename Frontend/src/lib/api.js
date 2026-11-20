import axios from 'axios'

export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '')

export const TOKEN_KEY = 'sb_token'

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* storage unavailable */
  }
}

/** The one axios instance used by the whole app. */
export const api = axios.create({ baseURL: API_URL, timeout: 60_000 })

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let unauthorizedHandler = null
/** AuthProvider registers a callback that logs out + redirects to /login with a toast. */
export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = fn
}

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status
    const url = error.config?.url || ''
    // A failed login attempt (e.g. /auth/demo) is not an expired session.
    const isAuthEndpoint = url.startsWith('/auth/demo') || url.startsWith('/auth/config')
    if (status === 401 && getToken() && !isAuthEndpoint && unauthorizedHandler) {
      unauthorizedHandler()
    }
    return Promise.reject(error)
  },
)

/** Build a ws:// or wss:// URL for a backend WebSocket path, with the JWT as `?token=`. */
export function wsUrl(path) {
  const base = API_URL.replace(/^http/, 'ws')
  // Resolve relative to the base so a path prefix in VITE_API_URL (e.g. https://host/api) is kept;
  // a leading "/" would make the path absolute and drop that prefix.
  const url = new URL(path.replace(/^\/+/, ''), base.endsWith('/') ? base : `${base}/`)
  const token = getToken()
  if (token) url.searchParams.set('token', token)
  return url.toString()
}

/** Extract a human readable message from an axios/FastAPI error. */
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  const detail = error?.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail.length) {
    return detail.map((d) => (d.loc ? `${d.loc.slice(1).join('.')}: ${d.msg}` : d.msg)).join('; ')
  }
  if (error?.response?.status === 429) return 'Too many requests. Please slow down and try again shortly.'
  if (error?.code === 'ERR_NETWORK') return 'Cannot reach the server. Check your connection and try again.'
  return error?.message || fallback
}

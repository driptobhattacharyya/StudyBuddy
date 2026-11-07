import { api, API_URL } from '../api'

/** GET /auth/config (public) -> { demo_mode: boolean, google_login: boolean } */
export const getAuthConfig = () => api.get('/auth/config').then((r) => r.data)

/** POST /auth/demo { role } -> { access_token, token_type, role }. Only when demo_mode. */
export const demoLogin = (role) => api.post('/auth/demo', { role }).then((r) => r.data)

/** GET /auth/me -> { email, name, picture, role, courses } */
export const getMe = () => api.get('/auth/me').then((r) => r.data)

/** Full-page redirect target that starts the Google OAuth flow. */
export const googleLoginUrl = () => `${API_URL}/login/google`

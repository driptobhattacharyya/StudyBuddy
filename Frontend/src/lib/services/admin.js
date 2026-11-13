import { api } from '../api'

/** Admin-only endpoints (role 'admin'). */

/** GET /admin/users -> [{ email, name, role, courses_count, ... }] */
export const getUsers = () => api.get('/admin/users').then((r) => r.data)

/** PATCH /admin/users/{email}/role { role: 'student'|'instructor'|'admin' } */
export const setUserRole = (email, role) => api.patch(`/admin/users/${encodeURIComponent(email)}/role`, { role }).then((r) => r.data)

/** GET /admin/stats -> { users, courses, assignments, submissions } (counts) */
export const getStats = () => api.get('/admin/stats').then((r) => r.data)

/** GET /admin/ai/usage?days=7 -> per-day and per-feature { requests, tokens_in, tokens_out, avg_latency_ms, errors, est_cost } */
export const getAIUsage = (days = 7) => api.get('/admin/ai/usage', { params: { days } }).then((r) => r.data)

/** GET /admin/ai/logs?limit=50 -> recent AI calls (ai_logs docs; use ai.getTrace for full detail) */
export const getAILogs = (limit = 50) => api.get('/admin/ai/logs', { params: { limit } }).then((r) => r.data)

/** POST /admin/demo/reset - re-runs the demo seed (only when DEMO_MODE) */
export const resetDemo = () => api.post('/admin/demo/reset').then((r) => r.data)

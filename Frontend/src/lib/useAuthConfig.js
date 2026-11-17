import { useEffect, useSyncExternalStore } from 'react'
import { api } from './api'

const DEFAULT = { demo_mode: false, google_login: true, ai_provider: null }

/** After this long without an answer we tell the user the (free-tier) server is probably asleep. */
export const SLOW_AFTER_MS = 2500
/** Give up (and offer a manual retry) after this long. */
export const GIVE_UP_AFTER_MS = 90_000

/** True for failures that mean "server unreachable / still booting" rather than a real application error. */
export function isColdStartError(err) {
  if (!err) return false
  if (!err.response) return true // network error, CORS-less 502 from the proxy, timeout
  return [502, 503, 504].includes(err.response.status)
}

/** Retry `fn` with exponential backoff while it fails with a cold-start error. `onWait(true)` fires while waiting. */
export async function withColdStartRetry(fn, { onWaiting, budgetMs = GIVE_UP_AFTER_MS, signal } = {}) {
  const started = Date.now()
  let delay = 1500
  for (;;) {
    try {
      const out = await fn()
      onWaiting?.(false)
      return out
    } catch (err) {
      if (!isColdStartError(err) || Date.now() - started + delay > budgetMs || signal?.aborted) {
        onWaiting?.(false)
        throw err
      }
      onWaiting?.(true)
      await new Promise((r) => setTimeout(r, delay))
      delay = Math.min(delay * 1.6, 8000)
    }
  }
}

// ---- module-level store: one fetch loop shared by every component ------------------------------------------------
// status: 'loading' (first try in flight, fast so far) | 'waking' (slow or failing, retrying) | 'ready' | 'failed'
let state = { status: 'loading', config: DEFAULT }
let started = false
const listeners = new Set()

function set(patch) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

async function load() {
  started = true
  set({ status: 'loading' })
  const slowTimer = setTimeout(() => state.status === 'loading' && set({ status: 'waking' }), SLOW_AFTER_MS)
  try {
    const c = await withColdStartRetry(
      () => api.get('/auth/config', { timeout: 12_000 }).then((r) => r.data),
      { onWaiting: (w) => w && state.status !== 'waking' && set({ status: 'waking' }) },
    )
    set({ status: 'ready', config: { ...DEFAULT, ...c } })
  } catch (err) {
    // A real (non-cold-start) error, e.g. 404 from an old backend: behave as before - no demo buttons.
    set({ status: isColdStartError(err) ? 'failed' : 'ready' })
  } finally {
    clearTimeout(slowTimer)
  }
}

const subscribe = (l) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
const getSnapshot = () => state

/** Restart the loop after it gave up. */
export function retryAuthConfig() {
  if (state.status === 'failed') load()
}

/**
 * Public backend feature flags: { demo_mode, google_login, ai_provider } plus
 * `status` ('loading' | 'waking' | 'ready' | 'failed'), `loading` (not ready yet) and `waking`.
 * Cached for the session; retries with backoff while the server wakes up.
 */
export function useAuthConfig() {
  const s = useSyncExternalStore(subscribe, getSnapshot)
  useEffect(() => {
    if (!started) load()
  }, [])
  return { ...s.config, status: s.status, loading: s.status === 'loading' || s.status === 'waking', waking: s.status === 'waking', failed: s.status === 'failed' }
}

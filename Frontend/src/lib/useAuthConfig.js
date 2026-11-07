import { useEffect, useState } from 'react'
import { getAuthConfig } from './services/auth'

const DEFAULT = { demo_mode: false, google_login: true }
let cached = null

/** Public backend feature flags: { demo_mode, google_login }. Cached for the session. */
export function useAuthConfig() {
  const [config, setConfig] = useState(cached ?? DEFAULT)
  const [loading, setLoading] = useState(!cached)

  useEffect(() => {
    if (cached) return
    let alive = true
    getAuthConfig()
      .then((c) => {
        cached = { ...DEFAULT, ...c }
        if (alive) setConfig(cached)
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  return { ...config, loading }
}

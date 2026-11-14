import { useEffect, useState } from 'react'
import { getDeadlines } from './services/courses'

/** Upcoming deadlines for the signed-in user (GET /user/deadlines): { loading, error, items }. */
export function useUpcomingDeadlines(limit = 6) {
  const [state, setState] = useState({ loading: true, error: null, items: [] })
  useEffect(() => {
    let alive = true
    getDeadlines(limit)
      .then((items) => alive && setState({ loading: false, error: null, items }))
      .catch((error) => alive && setState({ loading: false, error, items: [] }))
    return () => {
      alive = false
    }
  }, [limit])
  return state
}

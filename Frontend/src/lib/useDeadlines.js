import { useEffect, useState } from 'react'
import { getCourseContents } from './services/courses'

// Walk any JSON shape and collect objects that look like assignments (have a deadline).
function collect(node, course, out, seen = new Set()) {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) return node.forEach((n) => collect(n, course, out, seen))
  if (node.deadline && (node.assgn_type || node.question)) {
    const key = `${course.course_id}|${node.assgn_type}|${node.week}|${node.deadline}`
    if (!seen.has(key)) {
      seen.add(key)
      out.push({
        id: key,
        course_id: course.course_id,
        course_name: course.course_name,
        assgn_type: node.assgn_type,
        week: node.week,
        deadline: node.deadline,
      })
    }
  }
  Object.values(node).forEach((v) => collect(v, course, out, seen))
}

/**
 * Upcoming deadlines across the given courses (future only, soonest first).
 * Derived from GET /course/get_contents - TODO: replace with a dedicated endpoint if the backend adds one.
 */
export function useUpcomingDeadlines(courses, limit = 6) {
  const [state, setState] = useState({ loading: true, items: [] })
  const key = courses.map((c) => c.course_id).join(',')

  useEffect(() => {
    let alive = true
    if (!courses.length) {
      Promise.resolve().then(() => alive && setState({ loading: false, items: [] }))
      return () => {
        alive = false
      }
    }
    Promise.allSettled(courses.slice(0, 6).map((c) => getCourseContents(c.course_id).then((data) => ({ c, data }))))
      .then((results) => {
        const out = []
        const seen = new Set()
        results.forEach((r) => r.status === 'fulfilled' && collect(r.value.data, r.value.c, out, seen))
        const now = Date.now()
        const items = out
          .filter((d) => new Date(d.deadline).getTime() >= now)
          .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
          .slice(0, limit)
        if (alive) setState({ loading: false, items })
      })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, limit])

  return state
}

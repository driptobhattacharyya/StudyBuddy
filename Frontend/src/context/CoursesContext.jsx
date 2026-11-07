/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth, LAST_COURSE_KEY } from './AuthContext'
import { getCourses } from '@/lib/services/courses'

const CoursesContext = createContext(null)

const idOf = (c) => (typeof c === 'string' ? c : c?.course_id)

/**
 * Loads the course catalogue once per signed-in user.
 * - `courses`: Course[] ({ course_id, course_name })
 * - `myCourses`: the user's registered courses (from /auth/me) or all courses when none are registered
 * - `currentCourse`: the course in the URL (`:courseId`) if any
 */
export function CoursesProvider({ children }) {
  const { user } = useAuth()
  const { courseId } = useParams()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setCourses(await getCourses())
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const myCourses = useMemo(() => {
    const ids = new Set((user?.courses ?? []).map(idOf).filter(Boolean))
    if (!ids.size) return courses
    const mine = courses.filter((c) => ids.has(c.course_id))
    return mine.length ? mine : courses
  }, [courses, user])

  const currentCourse = useMemo(() => courses.find((c) => c.course_id === courseId) ?? null, [courses, courseId])

  useEffect(() => {
    if (!courseId) return
    try {
      localStorage.setItem(LAST_COURSE_KEY, courseId)
    } catch {
      /* ignore */
    }
  }, [courseId])

  const value = useMemo(
    () => ({ courses, myCourses, currentCourse, courseId: courseId ?? null, loading, error, reload: load }),
    [courses, myCourses, currentCourse, courseId, loading, error, load],
  )
  return <CoursesContext.Provider value={value}>{children}</CoursesContext.Provider>
}

export function useCourses() {
  const ctx = useContext(CoursesContext)
  if (!ctx) throw new Error('useCourses must be used inside <CoursesProvider>')
  return ctx
}

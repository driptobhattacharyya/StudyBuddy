import { getCourseContents } from './services/courses'

/** GET /course/get_contents returns a one-element array [{ materials, assignments, coding_assignments, ... }]; unwrap it. */
export async function loadCourseContents(courseId) {
  const data = await getCourseContents(courseId)
  return (Array.isArray(data) ? data[0] : data) ?? {}
}

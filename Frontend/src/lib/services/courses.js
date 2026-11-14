import { api } from '../api'

/**
 * Courses.   Course shape: { course_id: 'CS3001', course_name: 'Intro to ...' }
 * Instructor-only writes: createCourse, updateCourse.
 */

/** GET /course/getall -> Course[] */
export const getCourses = () => api.get('/course/getall').then((r) => r.data)

/** GET /course/get/{course_id} */
export const getCourse = (courseId) => api.get(`/course/get/${courseId}`).then((r) => r.data)

/** POST /course/create  { course_id, course_name }  (instructor) */
export const createCourse = (course) => api.post('/course/create', course).then((r) => r.data)

/** PUT /course/update/{course_id}  { course_id, course_name }  (instructor) */
export const updateCourse = (courseId, course) => api.put(`/course/update/${courseId}`, course).then((r) => r.data)

/** GET /course/course_material/{course_id} -> CourseMaterial[] (videos, slides, transcripts ... per week) */
export const getCourseMaterials = (courseId) => api.get(`/course/course_material/${courseId}`).then((r) => r.data)

/** GET /course/get_contents?course_id= -> everything grouped by week */
export const getCourseContents = (courseId) => api.get('/course/get_contents', { params: { course_id: courseId } }).then((r) => r.data)

/** GET /course/get_week_content?course_id=&week= (week 1..12) */
export const getWeekContent = (courseId, week) =>
  api.get('/course/get_week_content', { params: { course_id: courseId, week } }).then((r) => r.data)

/** POST /user/register_course  body: string[] of course_ids (replaces the user's registered courses) */
export const registerCourses = (courseIds) => api.post('/user/register_course', courseIds).then((r) => r.data)

/**
 * GET /user/deadlines -> upcoming assignment + coding deadlines across the caller's courses, soonest first:
 * [{ assgn_id, kind: 'assignment'|'coding', course_id, course_name, week, assgn_type, title, deadline, submitted }]
 */
export const getDeadlines = (limit = 20) => api.get('/user/deadlines', { params: { limit } }).then((r) => r.data)

import { api } from '../api'

/**
 * Weekly YouTube lectures. Lecture shape:
 * { _id, course_id, week (1..12), order, title, youtube_url, youtube_id, description?, notes? (markdown),
 *   duration?, source?, resources: [{ label, url }] }
 * Reads need any signed-in user; writes are instructor-only.
 */

/** GET /lecture/get/{course_id}?week= -> Lecture[] sorted by week, then order */
export const getLectures = (courseId, week) =>
  api.get(`/lecture/get/${courseId}`, { params: week ? { week } : undefined }).then((r) => r.data)

/** POST /lecture/create { course_id, week, order, title, youtube_url, ... } */
export const createLecture = (lecture) => api.post('/lecture/create', lecture).then((r) => r.data)

/** PUT /lecture/update/{id} - same body without course_id */
export const updateLecture = (id, lecture) => api.put(`/lecture/update/${id}`, lecture).then((r) => r.data)

/** DELETE /lecture/delete/{id} */
export const deleteLecture = (id) => api.delete(`/lecture/delete/${id}`).then((r) => r.data)

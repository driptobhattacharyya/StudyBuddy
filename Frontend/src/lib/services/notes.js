import { api } from '../api'

/**
 * Course notes (a.k.a. course material text). Note shape:
 * { _id, course_id, title, content (HTML or markdown string), url? , summary? }
 * Writes are instructor-only.
 */

/** GET /notes/get/{course_id} -> Note[] */
export const getNotes = (courseId) => api.get(`/notes/get/${courseId}`).then((r) => r.data)

/** POST /notes/create { course_id, title, content, url? } */
export const createNote = (note) => api.post('/notes/create', note).then((r) => r.data)

/** PUT /notes/update/{notes_id} { title, content, url? } */
export const updateNote = (noteId, note) => api.put(`/notes/update/${noteId}`, note).then((r) => r.data)

/** DELETE /notes/delete/{notes_id} */
export const deleteNote = (noteId) => api.delete(`/notes/delete/${noteId}`).then((r) => r.data)

/**
 * Course material records (video_URL | file_URL | pdf | transcript | notes | slides, per week).
 * Shape: { _id, course_id, material_type, url?, content?, week }
 */
export const getCourseMaterial = (courseId) => api.get(`/course_material/get/${courseId}`).then((r) => r.data)
export const createCourseMaterial = (material) => api.post('/course_material/create', material).then((r) => r.data)
export const updateCourseMaterial = (id, material) => api.put(`/course_material/update/${id}`, material).then((r) => r.data)
export const deleteCourseMaterial = (id) => api.delete(`/course_material/delete/${id}`).then((r) => r.data)

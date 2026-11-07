import { api } from '../api'

/**
 * Graded/practice question assignments (assgn_type: 'AQ' | 'PA' | 'GA').
 * Question shape: { _id, question, q_type: 'MCQ'|'MSQ'|'Numeric'|'String'|'Float', options[], answers[] (instructor only),
 *                   assgn_type, course_id, week (1..12), evaluated, deadline (ISO) }
 */

/** GET /course/get_assignment?course_id=&week=&assgn_type= -> Question[] */
export const getAssignments = (courseId, week, assgnType) =>
  api.get('/course/get_assignment', { params: { course_id: courseId, week, assgn_type: assgnType } }).then((r) => r.data)

/** GET /assignment/get/{assgn_id} */
export const getAssignment = (id) => api.get(`/assignment/get/${id}`).then((r) => r.data)

/** POST /assignment/create (instructor) - body is a Question without _id */
export const createAssignment = (question) => api.post('/assignment/create', question).then((r) => r.data)

/** POST /assignment/create_many_questions (instructor) - body: Question[] */
export const createManyAssignments = (questions) => api.post('/assignment/create_many_questions', questions).then((r) => r.data)

/** PUT /assignment/update/{assgn_id} (instructor) */
export const updateAssignment = (id, question) => api.put(`/assignment/update/${id}`, question).then((r) => r.data)

/** DELETE /assignment/delete/{assgn_id} (instructor) */
export const deleteAssignment = (id) => api.delete(`/assignment/delete/${id}`).then((r) => r.data)

/**
 * POST /user/submit_answers  body: [{ assgn_id, answer: any[] }, ...]  (user_id is filled in by the server)
 * -> { message, submission_time }
 */
export const submitAnswers = (answers) => api.post('/user/submit_answers', answers).then((r) => r.data)

/** GET /user/get_marks?course_id= -> week-wise marks for the course */
export const getMarks = (courseId) => api.get('/user/get_marks', { params: { course_id: courseId } }).then((r) => r.data)

/** GET /user/last_submission?course_id=&week=&assgn_type= */
export const getLastSubmission = (courseId, week, assgnType) =>
  api.get('/user/last_submission', { params: { course_id: courseId, week, assgn_type: assgnType } }).then((r) => r.data)

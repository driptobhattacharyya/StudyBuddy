import { api } from '../api'

/** UTF-8 safe base64 (the run endpoint expects the source code base64 encoded). */
export const encodeCode = (code) => {
  const bytes = new TextEncoder().encode(code)
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin)
}

/**
 * Coding assignments. Shape:
 * { _id, question, language: 'python'|'java'|'js'|'sql', public_testcase: [{input, output}],
 *   private_testcase (instructor only), assgn_type: 'PPA'|'GrPA', course_id, week, evaluated, deadline }
 */

/** GET /course/get_all_assignment?course_id=&week=&assgn_type= -> CodingAssignment[] (note: week is required, 1..12) */
export const getCodingAssignments = (courseId, week, assgnType) =>
  api.get('/course/get_all_assignment', { params: { course_id: courseId, week, assgn_type: assgnType } }).then((r) => r.data)

/** GET /coding_assignment/get/{assgn_id} */
export const getCodingAssignment = (id) => api.get(`/coding_assignment/get/${id}`).then((r) => r.data)

/** POST /coding_assignment/create_programming_question (instructor) */
export const createCodingAssignment = (assignment) =>
  api.post('/coding_assignment/create_programming_question', assignment).then((r) => r.data)

/** PUT /coding_assignment/update/{assgn_id} (instructor) */
export const updateCodingAssignment = (id, assignment) => api.put(`/coding_assignment/update/${id}`, assignment).then((r) => r.data)

/** DELETE /coding_assignment/delete/{assgn_id} (instructor) */
export const deleteCodingAssignment = (id) => api.delete(`/coding_assignment/delete/${id}`).then((r) => r.data)

/**
 * POST /coding_assignment/run  { assgn_id, code(base64) }
 * -> { public_testcases: Result[], private_testcases: Result[], passed_public_count: '2/3',
 *      passed_private_count: '4/5', mark: number } or { error }
 * Result: { input, expected(_output), output, passed | status: 'Pass'|'Fail', error?, time_ms? }
 */
export const runCode = (assgnId, code) =>
  api.post('/coding_assignment/run', { assgn_id: assgnId, code: encodeCode(code) }).then((r) => r.data)

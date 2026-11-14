import { api } from '../api'

/**
 * AI helpers. Streaming chat goes through useAIStream (src/lib/stream.js) with the paths below;
 * the REST helpers return the whole answer at once.
 */

/** WebSocket path: general assistant. Send { query }. */
export const WS_ASSISTANT = '/generate'
/** WebSocket path: RAG chat over a course. Send { query, course_id, week }. Replies may carry citations. */
export const WS_COURSE_CHAT = '/search_generate'

/** POST /summarize { text } -> summary (string, markdown) */
export const summarize = (text) => api.post('/summarize', { text }).then((r) => r.data?.summary ?? r.data)

/** POST /generate_questions { text } -> practice questions generated from a note. Response: { questions: [...] } */
export const generateQuestions = (text) => api.post('/generate_questions', { text }).then((r) => r.data?.questions ?? r.data)

/** POST /generate_assignment_questions { text } -> practice questions from assignment text */
export const generateAssignmentQuestions = (text) =>
  api.post('/generate_assignment_questions', { text }).then((r) => r.data?.questions ?? r.data)

/** POST /user/generate { query } -> { response } (non streaming general answer) */
export const ask = (query) => api.post('/user/generate', { query }).then((r) => r.data?.response ?? r.data)

/** POST /user/search_generate { query, course_id, week } -> { response } (non streaming RAG answer) */
export const askCourse = ({ query, courseId, week = 0 }) =>
  api.post('/user/search_generate', { query, course_id: courseId, week }).then((r) => r.data?.response ?? r.data)

// ---- AI observability -------------------------------------------------------------------------
/**
 * GET /ai/trace/{trace_id} -> { _id, user, feature, provider, model, system_prompt, prompt,
 *   retrieved: [{title, week, score, snippet}], tokens_in, tokens_out, latency_ms, status, error?, created_at }
 * Owner or admin only. REST AI responses carry `trace_id`; WS streams deliver it in the [[META]] frame.
 */
export const getTrace = (traceId) => api.get(`/ai/trace/${traceId}`).then((r) => r.data)

/**
 * Instructor: POST /ai/generate_from_material { material_id? , text?, course_id? }
 * -> { trace_id, summary, quiz: [{question, options, answer}], flashcards: [{title, content}] } (a draft to edit & publish)
 */
export const generateFromMaterial = (payload) => api.post('/ai/generate_from_material', payload).then((r) => r.data)

// ---- Full-response variants (additive): keep `trace_id` so the UI can show "Under the hood" --------
/** POST /summarize { text } -> { summary, trace_id } */
export const summarizeFull = (text) => api.post('/summarize', { text }).then((r) => r.data)

/** POST /generate_questions { text } -> { questions: [{question, option1..option4, correct_option}], trace_id } */
export const generateQuestionsFull = (text) => api.post('/generate_questions', { text }).then((r) => r.data)

/** POST /generate_assignment_questions { text } -> { questions: [...same shape...], trace_id } */
export const generateSimilarFull = (text) => api.post('/generate_assignment_questions', { text }).then((r) => r.data)

/**
 * POST /ai/hint { assgn_id, code?, message? } -> { hint (markdown), trace_id }.
 * The server builds the prompt from the stored assignment, so answers / hidden tests never touch the client.
 */
export const getHint = ({ assgnId, code, message }) =>
  api.post('/ai/hint', { assgn_id: assgnId, code: code || undefined, message: message || undefined }).then((r) => r.data)

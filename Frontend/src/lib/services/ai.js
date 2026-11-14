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

/** POST /gen_ai/hints - REST hint endpoint (currently a stub on the backend; prefer streaming via WS_ASSISTANT + buildHintQuery). */
export const getHints = (payload) => api.post('/gen_ai/hints', payload).then((r) => r.data)

/** POST /user/generate { query } -> { response } (non streaming general answer) */
export const ask = (query) => api.post('/user/generate', { query }).then((r) => r.data?.response ?? r.data)

/** POST /user/search_generate { query, course_id, week } -> { response } (non streaming RAG answer) */
export const askCourse = ({ query, courseId, week = 0 }) =>
  api.post('/user/search_generate', { query, course_id: courseId, week }).then((r) => r.data?.response ?? r.data)

/** Prompt used by the code editor's "Hint" button over WS_ASSISTANT (hints, never the full answer). */
export const buildHintQuery = ({ question, code }) =>
  `You are a programming tutor. Give a short hint that nudges the student toward the solution. Never reveal the full or exact answer.\n\nQuestion:\n${question}\n\nStudent code:\n${code || '(nothing yet)'}`

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

/**
 * Student: POST /coding_assignment/{id}/feedback { code } -> { trace_id, feedback (markdown: correctness, style, complexity) }
 */
export const getCodeFeedback = (assgnId, code) =>
  api.post(`/coding_assignment/${assgnId}/feedback`, { code }).then((r) => r.data)

// ---- Full-response variants (additive): keep `trace_id` so the UI can show "Under the hood" --------
/** POST /summarize { text } -> { summary, trace_id } */
export const summarizeFull = (text) => api.post('/summarize', { text }).then((r) => r.data)

/** POST /generate_questions { text } -> { questions: [{question, option1..option4, correct_option}], trace_id } */
export const generateQuestionsFull = (text) => api.post('/generate_questions', { text }).then((r) => r.data)

/** POST /generate_assignment_questions { text } -> { questions: [...same shape...], trace_id } */
export const generateSimilarFull = (text) => api.post('/generate_assignment_questions', { text }).then((r) => r.data)

/** Streamed Socratic hint prompt for a question assignment (MCQ/MSQ/numeric); never reveals the answer. */
export const buildQuestionHintQuery = ({ question, options = [], selected = [] }) =>
  `You are a Socratic tutor. Give ONE short hint (2-3 sentences) that nudges the student toward the answer by pointing at the relevant concept or asking a guiding question. ` +
  `Do NOT state the answer, do NOT say which option is correct, and do not eliminate options explicitly.\n\n` +
  `Question:\n${question}\n` +
  (options.length ? `Options:\n${options.map((o, i) => `${i + 1}. ${o}`).join('\n')}\n` : '') +
  (selected.length ? `\nStudent's current selection: ${selected.join(', ')}` : '')

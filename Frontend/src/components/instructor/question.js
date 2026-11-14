let uid = 0
export const nextUid = () => `o${++uid}`

export const Q_TYPES = [
  { value: 'MCQ', label: 'Multiple choice (one answer)' },
  { value: 'MSQ', label: 'Multiple select (many answers)' },
  { value: 'Numeric', label: 'Numeric answer' },
]

export const ASSGN_TYPES = [
  { value: 'PA', label: 'Practice' },
  { value: 'GA', label: 'Graded' },
  { value: 'AQ', label: 'Assignment quiz' },
]
export const assgnLabel = (v) => ASSGN_TYPES.find((t) => t.value === v)?.label ?? v

export const blankQuestion = () => ({
  question: '',
  q_type: 'MCQ',
  opts: [
    { id: nextUid(), text: '', correct: true },
    { id: nextUid(), text: '', correct: false },
    { id: nextUid(), text: '', correct: false },
    { id: nextUid(), text: '', correct: false },
  ],
  numeric: '',
})

/** API / AI question -> editable form state. Accepts `answer` (string) or `answers` (array). */
export function fromApiQuestion(q) {
  const type = /^num/i.test(q.q_type || '') || ['Float', 'String'].includes(q.q_type) ? 'Numeric' : q.q_type === 'MSQ' ? 'MSQ' : 'MCQ'
  const answers = (q.answers ?? (q.answer != null ? [q.answer] : [])).map(String)
  if (type === 'Numeric') return { question: q.question ?? '', q_type: 'Numeric', opts: blankQuestion().opts, numeric: answers[0] ?? '' }
  const options = (q.options ?? []).map(String)
  while (options.length < 2) options.push('')
  return {
    question: q.question ?? '',
    q_type: type,
    opts: options.map((text) => ({ id: nextUid(), text, correct: answers.includes(text) })),
    numeric: '',
  }
}

/** Returns an error message or null. */
export function validateQuestion(q) {
  if (!q.question.trim()) return 'Question text is required.'
  if (q.q_type === 'Numeric') {
    if (q.numeric === '' || Number.isNaN(Number(q.numeric))) return 'Enter the numeric answer.'
    return null
  }
  const filled = q.opts.filter((o) => o.text.trim())
  if (filled.length < 2) return 'Add at least two options.'
  if (new Set(filled.map((o) => o.text.trim())).size !== filled.length) return 'Options must be unique.'
  const correct = filled.filter((o) => o.correct)
  if (!correct.length) return 'Mark at least one correct answer.'
  if (q.q_type === 'MCQ' && correct.length !== 1) return 'Multiple choice needs exactly one correct answer.'
  return null
}

/** Form state -> API payload fields (question, q_type, options, answers). */
export function toApiQuestion(q) {
  if (q.q_type === 'Numeric') return { question: q.question.trim(), q_type: 'Numeric', options: [], answers: [Number(q.numeric)] }
  const filled = q.opts.filter((o) => o.text.trim())
  return {
    question: q.question.trim(),
    q_type: q.q_type,
    options: filled.map((o) => o.text.trim()),
    answers: filled.filter((o) => o.correct).map((o) => o.text.trim()),
  }
}

/** Parse bulk text: blocks separated by blank lines; first line = question, following lines = options, a leading `*` marks correct. */
export function parseBulk(text) {
  return text
    .split(/\n\s*\n/)
    .map((b) => b.split('\n').map((l) => l.trim()).filter(Boolean))
    .filter((l) => l.length)
    .map((lines) => {
      const [question, ...rest] = lines
      const opts = rest.map((l) => ({ id: nextUid(), text: l.replace(/^\*\s*/, '').replace(/^[a-dA-D][).]\s+/, ''), correct: l.startsWith('*') }))
      const correct = opts.filter((o) => o.correct).length
      return { question: question.replace(/^\d+[).]\s*/, ''), q_type: correct > 1 ? 'MSQ' : 'MCQ', opts, numeric: '' }
    })
}

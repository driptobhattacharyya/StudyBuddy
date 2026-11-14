/** Normalise the backend's { question, option1..4, correct_option } (or { options, answers }) shape. */
export function normalizeGeneratedQuestions(raw) {
  const list = Array.isArray(raw) ? raw : raw?.questions ?? []
  return list
    .map((q) => {
      const options = q.options?.length ? q.options.map(String) : [q.option1, q.option2, q.option3, q.option4].filter((o) => o != null && o !== '')
      let correct = q.correct_option ?? q.answers?.[0] ?? q.answer
      if (typeof correct === 'number' && options[correct - 1] != null) correct = options[correct - 1]
      const m = /^(?:option\s*)?([1-4a-d])$/i.exec(String(correct ?? '').trim())
      if (m && !options.includes(String(correct))) {
        const idx = /\d/.test(m[1]) ? Number(m[1]) - 1 : m[1].toLowerCase().charCodeAt(0) - 97
        if (options[idx] != null) correct = options[idx]
      }
      return { question: q.question, options, correct: String(correct ?? '') }
    })
    .filter((q) => q.question && q.options.length)
}


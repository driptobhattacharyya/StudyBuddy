/**
 * The backend appends sources to RAG answers as a trailing section, e.g.
 *   "...answer...\n\nSources:\n- Week 3: Photosynthesis\n- Week 4: Cell cycle"
 * Split that off so the UI can render chips. Returns { body, citations: string[] }.
 */
export function extractCitations(text = '') {
  const m = text.match(/\n+\s*(?:\*\*|#+\s*)?(?:sources?|citations?|references?)(?:\*\*)?\s*:?\s*(?:\*\*)?\s*\n([\s\S]*)$/i)
  if (!m) return { body: text, citations: [] }
  const items = m[1]
    .split(/\n|;/)
    .map((s) => s.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
    .filter(Boolean)
  if (!items.length || items.length > 12) return { body: text, citations: [] }
  return { body: text.slice(0, m.index).trimEnd(), citations: items }
}

// Per-viewer status of coding problems (set by the editor, read by the list). localStorage only.
const key = (id) => `sb:code-status:${id}`

export function getCodeStatus(id) {
  try {
    return JSON.parse(localStorage.getItem(key(id)) || 'null')
  } catch {
    return null
  }
}

/** status: { state: 'attempted' | 'solved', passed, total, mark, at } */
export function setCodeStatus(id, status) {
  try {
    localStorage.setItem(key(id), JSON.stringify({ ...status, at: new Date().toISOString() }))
  } catch {
    /* ignore */
  }
}

export const LANG_LABEL = { python: 'Python', js: 'JavaScript', javascript: 'JavaScript', java: 'Java', sql: 'SQL' }
export const monacoLang = (l) => (l === 'js' ? 'javascript' : l || 'python')
export const titleOf = (q) => {
  const first = (q || '').split('\n').find((l) => l.trim()) || 'Untitled problem'
  const clean = first.replace(/^#+\s*/, '').replace(/[*_`]/g, '').trim()
  return clean.length > 90 ? `${clean.slice(0, 87)}...` : clean
}

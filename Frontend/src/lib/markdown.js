/** Drop a leading `# <title>` H1 that merely repeats the note title (the page already shows it as a heading). */
export function stripLeadingTitle(content, title) {
  if (!content || !title) return content || ''
  const m = content.match(/^\s*#\s+(.+?)\s*(?:\r?\n|$)/)
  if (m && m[1].trim().toLowerCase() === String(title).trim().toLowerCase()) {
    return content.slice(m[0].length).replace(/^\s*\n/, '')
  }
  return content
}

const plain = (s) => s.replace(/[#*`>_]/g, '').replace(/\s+/g, ' ').trim()

/** Split a problem statement into { title, summary }: first heading (or first line) is the title, the first prose paragraph the summary. */
export function splitStatement(question) {
  const lines = String(question || '').split(/\r?\n/)
  const first = lines.findIndex((l) => l.trim())
  if (first < 0) return { title: '', summary: '' }
  const title = plain(lines[first])
  const rest = lines.slice(first + 1).filter((l) => !/^\s*(#|```)/.test(l))
  const summary = plain(rest.join(' '))
  return { title, summary }
}

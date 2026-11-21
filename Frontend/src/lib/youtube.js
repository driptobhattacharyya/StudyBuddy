const ID = /^[A-Za-z0-9_-]{11}$/
const HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'])
const PREFIXES = new Set(['embed', 'shorts', 'live', 'v'])

/** Video id from a YouTube link (watch, youtu.be, embed, shorts, live) or a bare id; null if none. Mirrors the API. */
export function youtubeId(value) {
  const v = String(value ?? '').trim()
  if (ID.test(v)) return v
  let url
  try {
    url = new URL(v)
  } catch {
    return null
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null
  const host = url.hostname.toLowerCase()
  const parts = url.pathname.split('/').filter(Boolean)
  let id = null
  if (host === 'youtu.be' && parts.length === 1) id = parts[0]
  else if (HOSTS.has(host)) {
    if (parts.length === 1 && parts[0] === 'watch') id = url.searchParams.get('v')
    else if (parts.length === 2 && PREFIXES.has(parts[0])) id = parts[1]
  }
  return id && ID.test(id) ? id : null
}

export const embedUrl = (id) => `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`
export const thumbUrl = (id) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`
export const watchUrl = (id) => `https://www.youtube.com/watch?v=${id}`

/** Group lectures by week, each week sorted by `order`. Returns [[week, lectures[]], ...] ascending. */
export function groupByWeek(lectures) {
  const weeks = new Map()
  for (const l of lectures ?? []) {
    if (!weeks.has(l.week)) weeks.set(l.week, [])
    weeks.get(l.week).push(l)
  }
  for (const list of weeks.values()) list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  return [...weeks.entries()].sort((a, b) => a[0] - b[0])
}

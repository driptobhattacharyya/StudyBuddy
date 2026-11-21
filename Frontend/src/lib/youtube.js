const PATTERNS = [
  /youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/)([A-Za-z0-9_-]{11})/,
  /youtu\.be\/([A-Za-z0-9_-]{11})/,
  /^([A-Za-z0-9_-]{11})$/,
]

/** Video id from any YouTube link (watch, youtu.be, embed, shorts, live) or a bare id; null if none. */
export function youtubeId(value) {
  const v = String(value ?? '').trim()
  for (const p of PATTERNS) {
    const m = v.match(p)
    if (m) return m[1]
  }
  return null
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

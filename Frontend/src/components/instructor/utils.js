export const WEEKS = Array.from({ length: 12 }, (_, i) => i + 1)

/** ISO string -> value for <input type="datetime-local"> (local time). */
export function toLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

/** datetime-local value -> ISO string (UTC). */
export function fromLocalInput(v) {
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

/** Default deadline: one week from now, as a datetime-local value. */
export const defaultDeadline = () => toLocalInput(new Date(Date.now() + 7 * 864e5).toISOString())

export const idOf = (x) => x?._id ?? x?.id

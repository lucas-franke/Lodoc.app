const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
// One date style everywhere: day first, in numbers (20.10.2026), the same in every browser language
const two = (n: number) => String(n).padStart(2, '0')
const weekday = new Intl.DateTimeFormat('en', { weekday: 'long' })

/** "just now", "5 minutes ago", "yesterday", "3 days ago"; older than a week → a date. */
export function formatRelative(time: number, now = Date.now()) {
  const diff = time - now
  const abs = Math.abs(diff)
  if (abs < MINUTE) return 'just now'
  if (abs < HOUR) return relative.format(Math.round(diff / MINUTE), 'minute')
  if (abs < DAY) return relative.format(Math.round(diff / HOUR), 'hour')
  if (abs < 7 * DAY) return relative.format(Math.round(diff / DAY), 'day')
  return formatDate(time)
}

/** "2026-10-20" in local time: a calendar day as a key */
export function dayKey(time: number | Date = new Date()) {
  const d = new Date(time)
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`
}

/** "20.10.2026" */
export function formatDate(time: number | Date) {
  const d = new Date(time)
  return `${two(d.getDate())}.${two(d.getMonth() + 1)}.${d.getFullYear()}`
}

/** "Tuesday, 20.10.2026" */
export function formatLongDate(time: number | Date) {
  return `${weekday.format(time)}, ${formatDate(time)}`
}

/** "20.10.2026, 14:05": full date and time, for tooltips. */
export function formatDateTime(time: number | Date) {
  const d = new Date(time)
  return `${formatDate(d)}, ${two(d.getHours())}:${two(d.getMinutes())}`
}

/** "1 note", "3 notes" */
export const plural = (n: number, word: string) => `${n.toLocaleString('en')} ${word}${n === 1 ? '' : 's'}`

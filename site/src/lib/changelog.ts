import type { CollectionEntry } from 'astro:content'

/** Newest version first ("0.10" after "0.9") */
export const byVersion = (a: CollectionEntry<'changelog'>, b: CollectionEntry<'changelog'>) =>
  b.data.version.localeCompare(a.data.version, 'en', { numeric: true })

/** "20.10.2026", like in the app */
export function formatDate(date: Date) {
  const two = (n: number) => String(n).padStart(2, '0')
  return `${two(date.getUTCDate())}.${two(date.getUTCMonth() + 1)}.${date.getUTCFullYear()}`
}

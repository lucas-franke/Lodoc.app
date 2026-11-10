// How the command palette matches and orders what you type. Without the database, so it can be tested alone.

/**
 * The words of a query, lowercased. Every one of them has to appear (in any order); a part in "double quotes" is
 * kept as one phrase and has to appear exactly like that.
 */
export function searchTerms(query: string): string[] {
  const terms: string[] = []
  for (const m of query.toLowerCase().matchAll(/"([^"]*)"?|(\S+)/g)) {
    const term = (m[1] ?? m[2]).trim().replace(/\s+/g, ' ')
    if (term && !terms.includes(term)) terms.push(term)
  }
  return terms
}

/** True when the text has every term (the text in any case) */
export const hasAllTerms = (text: string, terms: string[]) => {
  const lower = text.toLowerCase()
  return terms.every((t) => lower.includes(t))
}

/**
 * How well a note answers the query, 0 for not at all: the whole query in the title beats all its words in the
 * title, which beats words that are only in the text. `text` is everything searchable (title, body, tags).
 */
export function matchScore(title: string, text: string, query: string, terms: string[]): number {
  if (!terms.length || !hasAllTerms(text, terms)) return 0
  const lowerTitle = title.toLowerCase()
  if (lowerTitle.includes(query.trim().toLowerCase().replace(/"/g, ''))) return 3
  if (terms.every((t) => lowerTitle.includes(t))) return 2
  return 1
}

/** The matches ordered best first; equal matches by last edit. Pins don't count: this is a search, not a list. */
export function rankNotes<T extends { title: string; updatedAt: number }>(notes: T[], textOf: (note: T) => string, query: string): T[] {
  const terms = searchTerms(query)
  return notes
    .map((note) => ({ note, score: matchScore(note.title, textOf(note), query, terms) }))
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score || b.note.updatedAt - a.note.updatedAt)
    .map((m) => m.note)
}

/** The text cut into pieces, the ones that are a term marked: for highlighting every match */
export function splitMatches(text: string, terms: string[]): { text: string; match: boolean }[] {
  const found = terms.filter(Boolean).sort((a, b) => b.length - a.length)
  if (!found.length) return [{ text, match: false }]
  const pattern = new RegExp(`(${found.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi')
  return text
    .split(pattern)
    .filter(Boolean)
    .map((part) => ({ text: part, match: found.includes(part.toLowerCase()) }))
}

/**
 * About 70 characters of the text around the first term that the title doesn't already show (or the first term at
 * all), so the reason for the match is visible in one line. Null when no term is in the text.
 */
export function excerptAround(text: string, title: string, terms: string[]): string | null {
  const lower = text.toLowerCase()
  const lowerTitle = title.toLowerCase()
  const at = (list: string[]) => list.map((t) => lower.indexOf(t)).filter((i) => i >= 0).sort((a, b) => a - b)[0]
  const i = at(terms.filter((t) => !lowerTitle.includes(t))) ?? at(terms)
  if (i === undefined) return null
  const start = Math.max(0, i - 24)
  const flat = text.slice(start, i + 64).replace(/\s+/g, ' ')
  return (start > 0 ? '…' : '') + flat
}

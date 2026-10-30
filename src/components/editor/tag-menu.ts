import type { DefaultReactSuggestionItem } from '@blocknote/react'
import { db } from '@/db/db'
import { normalizeTag, tagCounts } from '@/db/notes'

// The "#" menu in a note: the tags already in use (inline-tags.ts shows the ones written in the text)

/** The tags already in use that match what was typed after "#", most used first; and a new one if it isn't there */
export async function tagMenuItems(query: string, insert: (tag: string) => void): Promise<DefaultReactSuggestionItem[]> {
  if (/\s/.test(query)) return []
  const typed = normalizeTag(query)
  const all = tagCounts(await db.notes.toArray()).sort((a, b) => b.count - a.count)
  const matches = all.filter((t) => t.tag.includes(typed)).sort((a, b) => Number(!b.tag.startsWith(typed)) - Number(!a.tag.startsWith(typed)))
  const items: DefaultReactSuggestionItem[] = matches.slice(0, 8).map((t) => ({
    title: `#${t.tag}`,
    subtext: t.count === 1 ? '1 note' : `${t.count} notes`,
    onItemClick: () => insert(t.tag),
  }))
  if (typed && /\p{L}/u.test(typed) && !all.some((t) => t.tag === typed)) {
    items.push({ title: `#${typed}`, subtext: 'New tag', onItemClick: () => insert(typed) })
  }
  return items
}

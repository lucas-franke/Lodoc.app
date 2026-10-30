import { CALLOUT_TONES, type CalloutTone } from './callout'
import type { Note } from '@/db/schema'

// What a note says, worked out from its content alone: titles, word counts, previews and excerpts for cards, checklist
// progress, tags. Pure functions without the database, so the components page (src/gallery) can use them;
// db/notes.ts re-exports them for the rest of the app.

/** Number of words in the note body (title excluded). */
export function noteWordCount(note: Note): number {
  return bodyParts(note).reduce((sum, part) => sum + (part.match(/\S+/g)?.length ?? 0), 0)
}

export function noteTitle(note: Pick<Note, 'title'>) {
  return note.title.trim() || 'Untitled'
}

/** Plain text of a note (title + body), used for search. */
export function noteText(note: Note): string {
  return [note.title, ...bodyParts(note), ...note.tags.map((t) => '#' + t)].join(' ')
}

/** Between blocks in one-line previews, so separate lines don't run together into one sentence */
const BLOCK_SEPARATOR = ' · '

/** The body and tags as one line, blocks kept apart: what search results quote around a match. */
export function noteSnippetText(note: Note): string {
  return [...bodyParts(note), ...note.tags.map((t) => '#' + t)].map(oneLine).filter(Boolean).join(BLOCK_SEPARATOR)
}

/** The start of a note's body as one line of plain text, for preview cards. */
export function notePreview(note: Note, maxLength = 200): string {
  const text = bodyParts(note).map(oneLine).filter(Boolean).join(BLOCK_SEPARATOR)
  return text.length > maxLength ? text.slice(0, maxLength).trimEnd() + '…' : text
}

const oneLine = (text: string) => text.replace(/\s+/g, ' ').trim()

/** One line of a card's preview, still what it was in the note */
export type ExcerptLine =
  | { kind: 'heading' | 'text' | 'bullet' | 'quote' | 'code'; text: string }
  | { kind: 'number'; text: string; n: number }
  | { kind: 'check'; text: string; checked: boolean }
  | { kind: 'callout'; text: string; tone: CalloutTone }
  | { kind: 'image'; url: string }

type BlockLike = { type?: string; content?: unknown; props?: Record<string, unknown>; children?: unknown[] }

/**
 * The start of a note's body for its card: up to `max` lines, each block as what it is (a heading, a list item, a
 * checklist item and whether it is ticked, an image), nested items in reading order. Empty lines are left out.
 */
export function noteExcerpt(note: Pick<Note, 'content'>, max = 8): ExcerptLine[] {
  const lines: ExcerptLine[] = []
  const walk = (blocks: unknown[]) => {
    let n = 0
    for (const block of blocks as BlockLike[]) {
      if (lines.length >= max) return
      n = block.type === 'numberedListItem' ? n + 1 : 0
      const line = excerptLine(block, n)
      if (line) lines.push(line)
      if (block.children?.length) walk(block.children)
    }
  }
  walk(note.content)
  return lines
}

function excerptLine(block: BlockLike, n: number): ExcerptLine | null {
  if (block.type === 'image') {
    const url = block.props?.url
    return typeof url === 'string' && url ? { kind: 'image', url } : null
  }
  const runs: string[] = []
  const cells: string[] = []
  collectInline(block.content, runs, cells)
  // A table's cells come back separately: one line for the table
  const text = oneLine(runs.length ? runs.join('') : cells.map(oneLine).filter(Boolean).join(BLOCK_SEPARATOR))
  if (!text) return null
  switch (block.type) {
    case 'heading':
      return { kind: 'heading', text }
    case 'bulletListItem':
    case 'toggleListItem':
      return { kind: 'bullet', text }
    case 'numberedListItem':
      return { kind: 'number', text, n }
    case 'checkListItem':
      return { kind: 'check', text, checked: block.props?.checked === true }
    case 'quote':
      return { kind: 'quote', text }
    case 'callout':
      return { kind: 'callout', text, tone: CALLOUT_TONES.find((tone) => tone === block.props?.tone) ?? 'neutral' }
    case 'codeBlock':
      return { kind: 'code', text }
    default:
      return { kind: 'text', text }
  }
}

/** The newest notes directly in a folder, as its card lists them */
export function latestNotesIn(notes: Note[], folderId: string, count = 3) {
  return notes
    .filter((n) => n.folderId === folderId)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, count)
}

/** How many of a note's checklist items are ticked (nested ones too), or null when it has none */
export function checklistProgress(note: Pick<Note, 'content'>): { done: number; total: number } | null {
  let done = 0
  let total = 0
  const walk = (blocks: unknown[]) => {
    for (const block of blocks as BlockLike[]) {
      if (block.type === 'checkListItem') {
        total++
        if (block.props?.checked === true) done++
      }
      if (block.children?.length) walk(block.children)
    }
  }
  walk(note.content)
  return total ? { done, total } : null
}

function bodyParts(note: Note): string[] {
  // One entry per block (or table cell); styled runs inside it are joined without spaces
  const parts: string[] = []
  const walk = (blocks: unknown[]) => {
    for (const block of blocks as { content?: unknown; children?: unknown[] }[]) {
      const inline: string[] = []
      collectInline(block.content, inline, parts)
      if (inline.length) parts.push(inline.join(''))
      if (block.children?.length) walk(block.children)
    }
  }
  walk(note.content)
  return parts
}

function collectInline(content: unknown, parts: string[], blockParts: string[]) {
  if (!Array.isArray(content)) {
    // Table content: { rows: [{ cells: [...] }] }; each cell becomes its own part
    const rows = (content as { rows?: { cells: unknown[] }[] } | undefined)?.rows
    rows?.forEach((row) =>
      row.cells.forEach((cell) => {
        const inline: string[] = []
        collectInline(Array.isArray(cell) ? cell : (cell as { content?: unknown }).content, inline, blockParts)
        if (inline.length) blockParts.push(inline.join(''))
      }),
    )
    return
  }
  for (const item of content as { type?: string; text?: string; content?: unknown; props?: { title?: string } }[]) {
    if (typeof item.text === 'string') parts.push(item.text)
    else if (item.type === 'noteLink' && item.props?.title) parts.push(item.props.title) // a link to another note
    else if (item.content) collectInline(item.content, parts, blockParts) // e.g. link text
  }
}

/** Tags are lowercase words without spaces ("#project-x"), at most 40 characters */
export function normalizeTag(tag: string) {
  return tag.trim().replace(/^#+/, '').replace(/\s+/g, '-').toLowerCase().slice(0, 40)
}

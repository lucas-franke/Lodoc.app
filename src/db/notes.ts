import { nanoid } from 'nanoid'
import { CALLOUT_TONES, type CalloutTone } from '@/lib/callout'
import { addImageAsset, pruneAssets } from './assets'
import { forgetItem, logChange, logMove, logRename } from './activity'
import { db } from './db'
import { coverAssetId, type Note } from './schema'
import { keepVersion, versionDue } from './versions'

/**
 * Notes created in this session, with the state they were created in. Leaving one that is still
 * exactly like that discards it (see `discardIfUntouched`), so "New note" followed by clicking
 * somewhere else doesn't leave an empty "Untitled" behind. A reload or closing the app skips that, so
 * `discardLeftoverNotes` removes such never-touched notes on the next start.
 */
const freshNotes = new Map<string, { folderId: string | null; order: number }>()

/** Notes that lists show (the sidebar, folders, the overview, pickers): all but the overview's own note */
export const isListed = (note: Note) => !note.overview

let overviewNote: Promise<string> | null = null

/** The name of the overview's scratchpad note (as search shows it); it was "Pinned on the overview" before */
const OVERVIEW_TITLE = 'Scratchpad'
const OLD_OVERVIEW_TITLE = 'Pinned on the overview'

/**
 * The note pinned on the overview, its scratchpad, made the first time it is needed (quietly: it is part of the
 * overview, not something the user created). One at a time, even if asked twice at once.
 */
export function getOverviewNote(): Promise<string> {
  overviewNote ??= (async () => {
    const existing = await db.notes.filter((n) => !!n.overview).first()
    if (existing) {
      // Its old name follows the box's new one, without counting as an edit
      if (existing.title === OLD_OVERVIEW_TITLE) await db.notes.update(existing.id, { title: OVERVIEW_TITLE })
      return existing.id
    }
    const now = Date.now()
    const id = nanoid()
    await db.notes.add({ id, title: OVERVIEW_TITLE, content: [], folderId: null, order: 0, favorite: false, pinned: false, tags: [], overview: true, createdAt: now, updatedAt: now })
    return id
  })().catch((error) => {
    overviewNote = null
    throw error
  })
  return overviewNote
}

export async function createNote(folderId: string | null = null): Promise<string> {
  const now = Date.now()
  const note: Note = {
    id: nanoid(),
    title: '',
    content: [],
    folderId,
    // Smaller than every existing order, so new notes appear at the top of their folder
    order: -now,
    favorite: false,
    pinned: false,
    tags: [],
    createdAt: now,
    updatedAt: now,
  }
  await db.notes.add(note)
  freshNotes.set(note.id, { folderId, order: note.order })
  logChange('Created', { type: 'note', id: note.id, title: '' })
  return note.id
}

/**
 * Deletes a note created in this session if the user left it exactly as it was created: no title, no
 * content, never edited, not pinned/favorited/moved, and not used on any board. Anything the user did
 * to it (even typing and deleting again) means it is kept. Only gets one chance per note.
 */
export async function discardIfUntouched(id: string) {
  const created = freshNotes.get(id)
  if (!created) return
  freshNotes.delete(id)
  await db.transaction('rw', db.notes, db.boards, async () => {
    const note = await db.notes.get(id)
    if (!note) return
    if (!isUntouched(note) || note.folderId !== created.folderId || note.order !== created.order) return
    const usedOnBoard = (await db.boards.toArray()).some((b) => b.nodes.some((n) => n.type === 'note' && n.noteId === id))
    if (usedOnBoard) return
    await db.notes.delete(id)
    forgetItem(id)
  })
}

/** Never touched since it was created: no title, no content, no edit, nothing set on it */
/** When this page loaded */
const SESSION_START = Date.now()

function isUntouched(note: Note) {
  return (
    note.title === '' &&
    note.content.length === 0 &&
    note.updatedAt === note.createdAt &&
    !note.favorite &&
    !note.pinned &&
    note.tags.length === 0 &&
    note.cover === undefined &&
    !note.template
  )
}

/**
 * On start: removes notes left exactly as created by an earlier session that ended on them (a reload or
 * a closed app). They hold nothing, so nothing is lost. A note on a board stays, and the note being
 * opened right now (`openId`) gets the usual chance instead: it goes when it is left untouched. Notes created
 * since this page loaded are never leftovers: one being filled in on start (a share, the journal) is still
 * empty for a moment.
 */
export async function discardLeftoverNotes(openId: string | null) {
  await db.transaction('rw', db.notes, db.boards, async () => {
    const leftovers = (await db.notes.toArray()).filter((n) => n.createdAt < SESSION_START && isUntouched(n))
    if (!leftovers.length) return
    const onBoards = new Set((await db.boards.toArray()).flatMap((b) => b.nodes.flatMap((n) => (n.type === 'note' ? [n.noteId] : []))))
    for (const note of leftovers) {
      if (onBoards.has(note.id)) continue
      if (note.id === openId) {
        freshNotes.set(note.id, { folderId: note.folderId, order: note.order })
        continue
      }
      await db.notes.delete(note.id)
      forgetItem(note.id)
    }
  })
}

/**
 * Saves a change to a note. The state it had before goes into its history (db/versions.ts): read just before
 * the write (IndexedDB runs them in order, so the read sees the old state), kept in the background. The write
 * itself starts right away, so nothing waits on the history when the page is closing.
 */
export function updateNote(id: string, changes: Partial<Pick<Note, 'title' | 'content'>>) {
  const before = versionDue(id) ? db.notes.get(id) : undefined
  const written = db.notes.update(id, { ...changes, updatedAt: Date.now() })
  if (before) void keepVersion(id, { before })
  return written
}

/** Renaming from a menu (titles typed on the page itself are edits, not logged as renames) */
export async function renameNote(id: string, title: string) {
  const before = await db.notes.get(id)
  await updateNote(id, { title: title.trim() })
  if (before) logRename({ type: 'note', id, title: noteTitle({ title: title.trim() }) }, noteTitle(before), before.createdAt)
}

/** Moves a note into another folder, placing it at the top there. */
export async function moveNote(id: string, folderId: string | null) {
  const before = await db.notes.get(id)
  await db.notes.update(id, { folderId, order: -Date.now() })
  if (before) logMove({ type: 'note', id, title: noteTitle(before) }, before.folderId, folderId)
}

export async function toggleFavorite(id: string) {
  const note = await db.notes.get(id)
  if (note) await db.notes.update(id, { favorite: !note.favorite })
}

/** Offers the note under "From template", or stops offering it */
export async function setTemplate(id: string, template: boolean) {
  await db.notes.update(id, { template: template || undefined })
}

export async function togglePinned(id: string) {
  const note = await db.notes.get(id)
  if (note) await db.notes.update(id, { pinned: !note.pinned })
}

export function deleteNote(id: string) {
  return deleteNotes([id])
}

/** Deletes notes, their cards (and the arrows to them) on every board and their cover images. */
export async function deleteNotes(ids: string[]) {
  await db.transaction('rw', [db.notes, db.boards, db.assets, db.trash], async () => {
    const gone = new Set(ids)
    const covers = (await db.notes.bulkGet(ids)).map((n) => coverAssetId(n))
    await db.notes.bulkDelete(ids)
    for (const board of await db.boards.toArray()) {
      const nodes = board.nodes.filter((n) => !(n.type === 'note' && gone.has(n.noteId)))
      if (nodes.length === board.nodes.length) continue
      const kept = new Set(nodes.map((n) => n.id))
      const edges = board.edges?.filter((e) => kept.has(e.source) && kept.has(e.target))
      await db.boards.update(board.id, { nodes, edges, updatedAt: Date.now() })
    }
    await pruneAssets(covers)
  })
}

/** Sets (or replaces) the cover image of a note. Counts as an edit. */
export async function setNoteCover(id: string, file: File) {
  const asset = await addImageAsset(file)
  const old = coverAssetId(await db.notes.get(id))
  await db.notes.update(id, { cover: { assetId: asset.id }, updatedAt: Date.now() })
  // If the note was deleted meanwhile, the new image has no user and is removed again
  await pruneAssets([old, asset.id])
}

/** Picks a gradient from the palette as the cover (replacing an image). */
export async function setNoteGradient(id: string, gradient: string) {
  const old = coverAssetId(await db.notes.get(id))
  await db.notes.update(id, { cover: { gradient }, updatedAt: Date.now() })
  await pruneAssets([old])
}

/** No cover at all (not even a generated gradient). */
export async function removeNoteCover(id: string) {
  const old = coverAssetId(await db.notes.get(id))
  await db.notes.update(id, { cover: null, updatedAt: Date.now() })
  await pruneAssets([old])
}

/** Pinned notes first, then most recently edited. */
export function sortNotes(notes: Note[]): Note[] {
  return sortNotesBy(notes, 'edited', 'desc')
}

/** Sidebar order: pinned notes first, then the manual (drag and drop) order. */
export function sortNotesManual(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.order - b.order)
}

export type NoteSortKey = 'edited' | 'created' | 'title' | 'length'
export type SortDirection = 'desc' | 'asc'

/**
 * Pinned notes stay on top; within each group, notes are sorted by `key`.
 * `desc` means newest / Z→A / longest first.
 */
export function sortNotesBy(notes: Note[], key: NoteSortKey, direction: SortDirection): Note[] {
  const words = key === 'length' ? new Map(notes.map((n) => [n.id, noteWordCount(n)])) : null
  const value = (n: Note) => {
    switch (key) {
      case 'edited':
        return n.updatedAt
      case 'created':
        return n.createdAt
      case 'length':
        return words!.get(n.id)!
      case 'title':
        return 0
    }
  }
  const sign = direction === 'desc' ? -1 : 1
  return [...notes].sort((a, b) => {
    const pinned = Number(b.pinned) - Number(a.pinned)
    if (pinned) return pinned
    const diff =
      key === 'title'
        ? noteTitle(a).localeCompare(noteTitle(b), undefined, { sensitivity: 'base', numeric: true })
        : value(a) - value(b)
    // Ties fall back to most recently edited
    return sign * diff || b.updatedAt - a.updatedAt
  })
}

/** A note created in this session that is still exactly as it was created (it is discarded when left). */
export function isFreshNote(id: string) {
  return freshNotes.has(id)
}

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

// ---- tags: lowercase words without spaces ("#project-x"), at most 40 characters

export function normalizeTag(tag: string) {
  return tag.trim().replace(/^#+/, '').replace(/\s+/g, '-').toLowerCase().slice(0, 40)
}

// Read and write in one step (modify), so quick successive changes can't overwrite each other
export async function addNoteTag(id: string, tag: string) {
  const t = normalizeTag(tag)
  if (!t) return
  await db.notes
    .where('id')
    .equals(id)
    .modify((note) => {
      if (note.tags.includes(t)) return
      note.tags = [...note.tags, t]
      note.updatedAt = Date.now()
    })
}

export async function removeNoteTag(id: string, tag: string) {
  await db.notes
    .where('id')
    .equals(id)
    .modify((note) => {
      if (!note.tags.includes(tag)) return
      note.tags = note.tags.filter((x) => x !== tag)
      note.updatedAt = Date.now()
    })
}

/** Every tag in use with how many notes have it, A–Z */
export function tagCounts(notes: Note[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const n of notes) for (const t of n.tags) counts.set(t, (counts.get(t) ?? 0) + 1)
  return [...counts].map(([tag, count]) => ({ tag, count })).sort((a, b) => a.tag.localeCompare(b.tag))
}

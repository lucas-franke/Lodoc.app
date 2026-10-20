import { nanoid } from 'nanoid'
import { logChange } from './activity'
import { flushPendingSaves } from '@/lib/pending-saves'
import { db } from './db'
import type { Note, NoteVersion, StoredBlock } from './schema'

// Note history: before a note is saved, the state it had is kept as a version, at most every few minutes per
// note (so a writing session leaves a trail, not one version per keystroke) and only when something changed.
// Images (data URLs inside the content) are stored once in versionImages and referenced from the versions,
// so ten versions of a note with a photo don't hold ten copies of it. On this device only; not in backups.

/** At most one version per note in this time */
const EVERY = 10 * 60 * 1000
/** Versions kept per note, newest first */
const PER_NOTE = 40
/** Versions older than this are removed on start */
const MAX_AGE = 90 * 24 * 60 * 60 * 1000
const IMAGE_REF = 'version-image:'
const RESTORED = 'lodoc:note-restored'

type Block = { props?: Record<string, unknown>; children?: Block[] }

/** When each note last got a version (filled from the database on first use) */
const lastKept = new Map<string, number>()
/** A version being taken right now, so quick saves in a row don't take two */
const taking = new Map<string, Promise<void>>()
/** Hashes of images seen recently (hashing a large image costs a moment) */
const hashes = new Map<string, string>()

function walk(blocks: Block[], visit: (block: Block) => void) {
  for (const block of blocks) {
    visit(block)
    if (block.children?.length) walk(block.children, visit)
  }
}

async function hashOf(dataUrl: string) {
  const known = hashes.get(dataUrl)
  if (known) return known
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(dataUrl))
  const hash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
  if (hashes.size > 50) hashes.delete(hashes.keys().next().value!)
  hashes.set(dataUrl, hash)
  return hash
}

/** A copy of the blocks with inline images swapped for references; the images are stored (once) */
async function pack(content: StoredBlock[]): Promise<StoredBlock[]> {
  const copy = structuredClone(content) as unknown as Block[]
  const found: { block: Block; url: string }[] = []
  walk(copy, (block) => {
    const url = block.props?.url
    if (typeof url === 'string' && url.startsWith('data:')) found.push({ block, url })
  })
  const images = await Promise.all(
    found.map(async ({ block, url }) => {
      const hash = await hashOf(url)
      block.props = { ...block.props, url: IMAGE_REF + hash }
      return { hash, dataUrl: url }
    }),
  )
  if (images.length) await db.versionImages.bulkPut(images)
  return copy as unknown as StoredBlock[]
}

/** The blocks as they can be shown or restored, with the images back in */
async function unpack(content: StoredBlock[]): Promise<StoredBlock[]> {
  const copy = structuredClone(content) as unknown as Block[]
  const refs: Block[] = []
  walk(copy, (block) => {
    const url = block.props?.url
    if (typeof url === 'string' && url.startsWith(IMAGE_REF)) refs.push(block)
  })
  const images = await db.versionImages.bulkGet(refs.map((b) => (b.props!.url as string).slice(IMAGE_REF.length)))
  refs.forEach((block, i) => (block.props = { ...block.props, url: images[i]?.dataUrl ?? '' }))
  return copy as unknown as StoredBlock[]
}

const sameState = (a: Pick<NoteVersion, 'title' | 'content'>, b: Pick<NoteVersion, 'title' | 'content'>) =>
  a.title === b.title && JSON.stringify(a.content) === JSON.stringify(b.content)

/** False when the note surely got a version a moment ago (known without reading anything) */
export function versionDue(noteId: string, now = Date.now()) {
  const last = lastKept.get(noteId)
  return last === undefined || now - last >= EVERY
}

/**
 * Keeps a state of the note as a version: `before` (read by updateNote just before its write) or what it has
 * now. Not when one was kept in the last few minutes (`force` skips that wait), the note is empty, or nothing
 * changed since the last version.
 */
export function keepVersion(
  noteId: string,
  { force = false, now = Date.now(), before }: { force?: boolean; now?: number; before?: Promise<Note | undefined> } = {},
): Promise<void> {
  const running = taking.get(noteId)
  if (running) return running
  const job = (async () => {
    if (!lastKept.has(noteId)) {
      const latest = await db.versions.where('noteId').equals(noteId).reverse().sortBy('at')
      lastKept.set(noteId, latest[0]?.at ?? 0)
    }
    if (!force && now - lastKept.get(noteId)! < EVERY) return
    const note = await (before ?? db.notes.get(noteId))
    if (!note || (!note.title && note.content.length === 0)) return
    const state = { title: note.title, content: await pack(note.content) }
    const versions = await db.versions.where('noteId').equals(noteId).reverse().sortBy('at')
    lastKept.set(noteId, now)
    if (versions[0] && sameState(versions[0], state)) return
    await db.versions.add({ id: nanoid(), noteId, at: note.updatedAt, ...state })
    // The oldest go once there are too many
    const extra = versions.slice(PER_NOTE - 1)
    if (extra.length) await db.versions.bulkDelete(extra.map((v) => v.id))
  })()
    .catch(() => undefined) // history is a bonus: a failed snapshot never blocks the save
    .finally(() => taking.delete(noteId))
  taking.set(noteId, job)
  return job
}

/** A note's versions, newest first (content still packed: use loadVersion to show one) */
export async function listVersions(noteId: string): Promise<NoteVersion[]> {
  return db.versions.where('noteId').equals(noteId).reverse().sortBy('at')
}

/** One version with its images, ready to show */
export async function loadVersion(id: string): Promise<NoteVersion | undefined> {
  const version = await db.versions.get(id)
  return version && { ...version, content: await unpack(version.content) }
}

/**
 * Puts an earlier version back. What the note has now is kept as a version first, so a restore can itself be
 * undone from the history. The open editor is told (onNoteRestored), since it only reads a note when it opens.
 */
export async function restoreVersion(id: string) {
  const version = await loadVersion(id)
  if (!version) return
  // What was typed a moment ago is saved first, so it is part of the state kept before the restore
  await flushPendingSaves()
  await keepVersion(version.noteId, { force: true })
  await db.notes.update(version.noteId, { title: version.title, content: version.content, updatedAt: Date.now() })
  logChange('Restored an earlier version', { type: 'note', id: version.noteId, title: version.title })
  window.dispatchEvent(new CustomEvent(RESTORED, { detail: { noteId: version.noteId, title: version.title, content: version.content } }))
}

export function onNoteRestored(handler: (restored: { noteId: string; title: string; content: StoredBlock[] }) => void) {
  const listener = (e: Event) => handler((e as CustomEvent).detail)
  window.addEventListener(RESTORED, listener)
  return () => window.removeEventListener(RESTORED, listener)
}

/**
 * On start: removes versions older than MAX_AGE and those of notes that are gone (deleted for good, or replaced
 * by an import), then the images no version uses any more.
 */
export async function pruneVersions(now = Date.now()) {
  const [noteIds, trash] = await Promise.all([db.notes.toCollection().primaryKeys(), db.trash.toArray()])
  const alive = new Set([...noteIds, ...trash.flatMap((t) => t.notes.map((n) => n.id))])
  await db.versions.filter((v) => v.at < now - MAX_AGE || !alive.has(v.noteId)).delete()
  const used = new Set<string>()
  await db.versions.each((v) => {
    for (const m of JSON.stringify(v.content).matchAll(/version-image:([0-9a-f]{64})/g)) used.add(m[1])
  })
  const unused = (await db.versionImages.toCollection().primaryKeys()).filter((hash) => !used.has(hash))
  if (unused.length) await db.versionImages.bulkDelete(unused)
}

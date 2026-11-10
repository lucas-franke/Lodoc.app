import { logChange } from './activity'
import { db } from './db'
import type { Note, StoredBlock } from './schema'
import { normalizeTag } from '@/lib/note-text'

// A tag as a whole, across every note that has it: rename (which merges when the new name exists already) and
// remove. These don't count as edits of the notes: "last edited" and the order of the lists stay as they are.

/** As the editor reads tags in the text (editor/inline-tags.ts): "#" at the start or after a space or bracket */
const TAG_START = /[\s([{]/
const TAG_BODY = /^[\p{L}\p{N}_/-]+/u

type Inline = { type?: string; text?: string; styles?: { code?: boolean } }

/** `#from` → `#to` in one line of text runs. A tag is only read within one run, like most are written. */
function renameInRuns(runs: Inline[], from: string, to: string): boolean {
  let changed = false
  let before = '' // the character in front of this run
  runs.forEach((run, i) => {
    if (run.type !== 'text' || typeof run.text !== 'string') {
      before = 'x'
      return
    }
    const text = run.text
    if (!run.styles?.code) {
      let out = ''
      let at = 0
      while (at < text.length) {
        const hash = text.indexOf('#', at)
        if (hash < 0) break
        const prev = hash === 0 ? before : text[hash - 1]
        const body = TAG_BODY.exec(text.slice(hash + 1))?.[0] ?? ''
        const end = hash + 1 + body.length
        // Not when the word goes on in the next run (another style from there on)
        const next = runs[i + 1]
        const goesOn = end === text.length && next?.type === 'text' && TAG_BODY.test(next.text ?? '')
        if (body && (prev === '' || TAG_START.test(prev)) && !goesOn && normalizeTag(body) === from) {
          out += text.slice(at, hash) + '#' + to
          changed = true
        } else out += text.slice(at, Math.max(end, hash + 1))
        at = Math.max(end, hash + 1)
      }
      run.text = out + text.slice(at)
    }
    before = text.slice(-1)
  })
  return changed
}

/** Walks a note's blocks (lists, tables, nested blocks) and renames the tag wherever it is written; not in code or links */
function renameInContent(value: unknown, from: string, to: string): boolean {
  if (Array.isArray(value)) {
    const runs = value.some((v) => (v as Inline)?.type === 'text' && typeof (v as Inline).text === 'string')
    let changed = runs ? renameInRuns(value as Inline[], from, to) : false
    for (const v of value) if ((v as Inline)?.type !== 'text' && renameInContent(v, from, to)) changed = true
    return changed
  }
  if (!value || typeof value !== 'object') return false
  const node = value as { type?: string; content?: unknown; children?: unknown; rows?: unknown; cells?: unknown }
  if (node.type === 'codeBlock' || node.type === 'link') return false
  let changed = false
  for (const part of [node.content, node.children, node.rows, node.cells]) if (renameInContent(part, from, to)) changed = true
  return changed
}

/**
 * Gives every note with the tag `from` the tag `to` instead, also where it is written as #tag in the text.
 * Notes that have `to` already just lose `from`: that is the merge. Returns how many notes had the tag.
 */
export async function renameTag(from: string, toRaw: string): Promise<number> {
  const to = normalizeTag(toRaw)
  if (!to || to === from) return 0
  let count = 0
  await db.notes
    .filter((n) => n.tags.includes(from))
    .modify((note: Note) => {
      count++
      note.tags = [...new Set(note.tags.map((t) => (t === from ? to : t)))]
      const content = structuredClone(note.content)
      if (renameInContent(content, from, to)) note.content = content as StoredBlock[]
    })
  if (count) logChange(`Renamed the tag #${from} to #${to}`)
  return count
}

/** The tags some notes had, to put them back (Undo) */
export type TagsBefore = { id: string; tags: string[] }[]

/** Takes the tag off every note. What is written as #tag in a note's text stays there. Returns what to restore. */
export async function removeTag(tag: string): Promise<TagsBefore> {
  const before: TagsBefore = []
  await db.notes
    .filter((n) => n.tags.includes(tag))
    .modify((note: Note) => {
      before.push({ id: note.id, tags: note.tags })
      note.tags = note.tags.filter((t) => t !== tag)
    })
  if (before.length) logChange(`Removed the tag #${tag} from ${before.length === 1 ? '1 note' : `${before.length} notes`}`)
  return before
}

/** Undo of `removeTag`: the tag is back on the notes that had it (notes deleted meanwhile are skipped) */
export async function restoreTag(tag: string, before: TagsBefore) {
  await db.transaction('rw', db.notes, async () => {
    for (const { id } of before) {
      await db.notes
        .where('id')
        .equals(id)
        .modify((note: Note) => {
          if (!note.tags.includes(tag)) note.tags = [...note.tags, tag]
        })
    }
  })
  logChange(`Put the tag #${tag} back`)
}

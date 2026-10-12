import { BlockNoteEditor } from '@blocknote/core'
import { editorSchema } from '@/components/editor/schema'
import { zipSync, strToU8 } from 'fflate'
import { db } from '@/db/db'
import { descendantIds } from '@/db/folders'
import { noteTitle } from '@/db/notes'
import type { Note } from '@/db/schema'
import { flushPendingSaves } from './pending-saves'
import { safeFileName, saveFile } from './save-file'

// Loaded only when a download starts (import('./export-markdown')), so BlockNote's converter and the zip
// library stay out of the main bundle.

// Same schema as the editor, so note links come out as [[Title]]
let converter: BlockNoteEditor<typeof editorSchema.blockSchema, typeof editorSchema.inlineContentSchema, typeof editorSchema.styleSchema> | null = null

/** A note as Markdown: its title as a heading, then the content (lossy: e.g. colors are dropped). */
export function noteToMarkdown(note: Note): string {
  converter ??= BlockNoteEditor.create({ schema: editorSchema })
  const body = note.content.length ? converter.blocksToMarkdownLossy(note.content as never) : ''
  return `# ${noteTitle(note)}\n\n${body}`.trimEnd() + '\n'
}

/** Picks "name.ext", or "name (2).ext" etc. when that is taken in the same place. */
function uniqueName(taken: Set<string>, base: string, ext = '') {
  let name = base + ext
  for (let i = 2; taken.has(name.toLowerCase()); i++) name = `${base} (${i})${ext}`
  taken.add(name.toLowerCase())
  return name
}

export async function downloadNote(id: string) {
  await flushPendingSaves()
  const note = await db.notes.get(id)
  if (!note) throw new Error('This note no longer exists.')
  saveFile(new Blob([noteToMarkdown(note)], { type: 'text/markdown' }), `${safeFileName(noteTitle(note))}.md`)
}

const BATCH = 25
const nextFrame = () => new Promise((resolve) => setTimeout(resolve, 0))

/**
 * A folder as a .zip: the folder and its subfolders become directories, each note a .md file.
 * Converts in small batches so the page stays responsive with many notes.
 */
export async function downloadFolder(id: string) {
  await flushPendingSaves()
  const folders = await db.folders.toArray()
  const root = folders.find((f) => f.id === id)
  if (!root) throw new Error('This folder no longer exists.')
  const ids = descendantIds(folders, id)
  const notes = await db.notes.where('folderId').anyOf([...ids]).toArray()

  // Directory path of every folder, relative to the zip root; names are unique among siblings
  const paths = new Map<string, string>([[id, '']])
  const takenIn = new Map<string, Set<string>>() // folder id → names used inside it
  const taken = (folderId: string) => takenIn.get(folderId) ?? takenIn.set(folderId, new Set()).get(folderId)!
  const byParent = (parentId: string) =>
    folders.filter((f) => f.parentId === parentId).sort((a, b) => a.order - b.order)
  const queue = [id]
  while (queue.length) {
    const parentId = queue.shift()!
    for (const child of byParent(parentId)) {
      const name = uniqueName(taken(parentId), safeFileName(child.name, 'Untitled folder'))
      paths.set(child.id, `${paths.get(parentId)}${name}/`)
      queue.push(child.id)
    }
  }

  const files: Record<string, Uint8Array> = {}
  for (let i = 0; i < notes.length; i += BATCH) {
    for (const note of notes.slice(i, i + BATCH)) {
      const folderId = note.folderId!
      const name = uniqueName(taken(folderId), safeFileName(noteTitle(note)), '.md')
      files[paths.get(folderId) + name] = strToU8(noteToMarkdown(note))
    }
    await nextFrame()
  }
  // Keep empty subfolders as (empty) directories
  for (const path of paths.values()) {
    if (path && !Object.keys(files).some((f) => f.startsWith(path))) files[path] = new Uint8Array()
  }

  const zip = zipSync(files, { level: 6 })
  saveFile(new Blob([zip as BlobPart], { type: 'application/zip' }), `${safeFileName(root.name, 'Folder')}.zip`)
  return notes.length
}

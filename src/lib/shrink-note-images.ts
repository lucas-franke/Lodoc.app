import { db } from '@/db/db'
import type { Note, StoredBlock } from '@/db/schema'
import { blobToDataUrl, compressImage, isCompressible, NOTE_IMAGE } from './image-compress'

/** Inline images longer than this (about 300 KB of image data) were stored before uploads were compressed. */
const OVERSIZED = 400_000

/** Inline images that are too large, or WebP (which e.g. Google Docs won't accept when pasted). */
const urlToShrink = (block: StoredBlock) => {
  if (block.type !== 'image') return undefined
  const url = (block.props as { url?: unknown } | undefined)?.url
  if (typeof url !== 'string') return undefined
  const type = /^data:([^;,]+)/.exec(url)?.[1]
  if (!type || !isCompressible(type)) return undefined
  return type === 'image/webp' || url.length > OVERSIZED ? url : undefined
}

/** Compresses oversized inline images in the blocks; returns the new blocks, or null if nothing changed. */
async function shrinkBlocks(blocks: StoredBlock[]): Promise<StoredBlock[] | null> {
  let changed = false
  const next = await Promise.all(
    blocks.map(async (block) => {
      let result = block
      const url = urlToShrink(block)
      if (url) {
        try {
          const original = await (await fetch(url)).blob()
          const compressed = await compressImage(original, NOTE_IMAGE)
          if (compressed !== original) {
            result = { ...result, props: { ...(block.props as object), url: await blobToDataUrl(compressed) } }
            changed = true
          }
        } catch {
          // An unreadable image stays as it is
        }
      }
      if (Array.isArray(block.children) && block.children.length) {
        const children = await shrinkBlocks(block.children as StoredBlock[])
        if (children) {
          result = { ...result, children }
          changed = true
        }
      }
      return result
    }),
  )
  return changed ? next : null
}

/** Whether the note is unchanged since it was read (it may have been edited while images were compressed). */
const unchanged = (stored: Note | undefined, read: Note) => stored?.updatedAt === read.updatedAt

/**
 * Notes from before uploads were compressed can hold images of several megabytes as text. Shrinks those
 * (and converts WebP images to JPEG/PNG) in the background, one note at a time. Only oversized or WebP
 * images qualify, so running it again does nothing; the notes' "edited" time stays as it was.
 */
export async function shrinkNoteImages() {
  for (const note of await db.notes.toArray()) {
    const content = await shrinkBlocks(note.content)
    if (!content) continue
    await db.transaction('rw', db.notes, async () => {
      if (unchanged(await db.notes.get(note.id), note)) await db.notes.update(note.id, { content })
    })
  }

  // Notes in the trash too, so restoring one doesn't bring the old size back
  for (const entry of await db.trash.toArray()) {
    const notes = await Promise.all(entry.notes.map(async (n) => ({ ...n, content: (await shrinkBlocks(n.content)) ?? n.content })))
    if (notes.every((n, i) => n.content === entry.notes[i].content)) continue
    await db.trash.update(entry.id, { notes })
  }
}

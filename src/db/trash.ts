import { nanoid } from 'nanoid'
import { pruneAssets } from './assets'
import { boardTitle, deleteBoard } from './boards'
import { db } from './db'
import { deleteFolder, descendantIds } from './folders'
import { deleteNotes, noteTitle } from './notes'
import { coverAssetId, type TrashEntry } from './schema'

// Deleting moves things into the trash first: the items plus the cards their notes had on other boards.
// Restoring puts everything back; entries older than TRASH_DAYS are removed for good on start.

export const TRASH_DAYS = 30
const tables = [db.notes, db.folders, db.boards, db.assets, db.trash]

/** Cards of these notes on boards that stay (so they can come back with the notes) */
async function cardsOf(noteIds: Set<string>, exceptBoard?: string): Promise<TrashEntry['cards']> {
  const cards: TrashEntry['cards'] = []
  for (const board of await db.boards.toArray()) {
    if (board.id === exceptBoard) continue
    for (const node of board.nodes) {
      if (node.type !== 'note' || !noteIds.has(node.noteId)) continue
      const edges = board.edges?.filter((e) => e.source === node.id || e.target === node.id)
      cards.push({ boardId: board.id, node, ...(edges?.length ? { edges } : {}) })
    }
  }
  return cards
}

/** Moves a note to the trash. Returns the trash entry id (for Undo). */
export function trashNote(id: string) {
  return db.transaction('rw', tables, async () => {
    const note = await db.notes.get(id)
    if (!note) return null
    const entry: TrashEntry = {
      id: nanoid(),
      kind: 'note',
      title: noteTitle(note),
      deletedAt: Date.now(),
      notes: [note],
      folders: [],
      boards: [],
      cards: await cardsOf(new Set([id])),
    }
    await db.trash.add(entry)
    await deleteNotes([id])
    return entry.id
  })
}

/** Moves a folder with its subfolders and all notes inside to the trash. */
export function trashFolder(id: string) {
  return db.transaction('rw', tables, async () => {
    const folder = await db.folders.get(id)
    if (!folder) return null
    const ids = [...descendantIds(await db.folders.toArray(), id)]
    const folders = await db.folders.bulkGet(ids)
    const notes = await db.notes.where('folderId').anyOf(ids).toArray()
    const entry: TrashEntry = {
      id: nanoid(),
      kind: 'folder',
      title: folder.name,
      deletedAt: Date.now(),
      notes,
      folders: folders.filter((f) => !!f),
      boards: [],
      cards: await cardsOf(new Set(notes.map((n) => n.id))),
    }
    await db.trash.add(entry)
    await deleteFolder(id)
    return entry.id
  })
}

/** Moves a board to the trash (its notes stay where they are). */
export function trashBoard(id: string) {
  return db.transaction('rw', tables, async () => {
    const board = await db.boards.get(id)
    if (!board) return null
    const entry: TrashEntry = {
      id: nanoid(),
      kind: 'board',
      title: boardTitle(board),
      deletedAt: Date.now(),
      notes: [],
      folders: [],
      boards: [board],
      cards: [],
    }
    await db.trash.add(entry)
    await deleteBoard(id)
    return entry.id
  })
}

/**
 * Puts a trash entry back. Notes and folders whose parent no longer exists come back at the top level;
 * cards return to their boards if those still exist. Returns what was restored, or null if it is gone.
 */
export function restoreTrash(entryId: string) {
  return db.transaction('rw', tables, async () => {
    const entry = await db.trash.get(entryId)
    if (!entry) return null
    const restoredFolders = new Set(entry.folders.map((f) => f.id))
    const existing = new Set(await db.folders.toCollection().primaryKeys())
    const folderExists = (id: string | null) => id === null || restoredFolders.has(id) || existing.has(id)
    await db.folders.bulkPut(entry.folders.map((f) => (folderExists(f.parentId) ? f : { ...f, parentId: null })))
    await db.notes.bulkPut(entry.notes.map((n) => (folderExists(n.folderId) ? n : { ...n, folderId: null })))
    await db.boards.bulkPut(entry.boards)
    for (const boardId of new Set(entry.cards.map((c) => c.boardId))) {
      const board = await db.boards.get(boardId)
      if (!board) continue
      const present = new Set(board.nodes.map((n) => n.id))
      const back = entry.cards.filter((c) => c.boardId === boardId && !present.has(c.node.id))
      if (!back.length) continue
      const nodes = [...board.nodes, ...back.map((c) => c.node)]
      // Arrows come back when both of their ends are on the board again (and they aren't there already)
      const ids = new Set(nodes.map((n) => n.id))
      const edges = board.edges ?? []
      const known = new Set(edges.map((e) => e.id))
      const arrows = back.flatMap((c) => c.edges ?? []).filter((e) => !known.has(e.id) && ids.has(e.source) && ids.has(e.target))
      await db.boards.update(boardId, { nodes, edges: [...edges, ...new Map(arrows.map((e) => [e.id, e])).values()], updatedAt: Date.now() })
    }
    await db.trash.delete(entryId)
    return entry
  })
}

/** Removes trash entries for good, with the images only they used. */
export function deleteForever(entryIds: string[]) {
  return db.transaction('rw', tables, async () => {
    const entries = (await db.trash.bulkGet(entryIds)).filter((e) => !!e)
    await db.trash.bulkDelete(entryIds)
    await pruneAssets(
      entries.flatMap((e) => [
        ...e.notes.map((n) => coverAssetId(n)),
        ...e.boards.flatMap((b) => b.nodes.map((n) => (n.type === 'image' ? n.assetId : undefined))),
      ]),
    )
  })
}

export async function emptyTrash() {
  await deleteForever(await db.trash.toCollection().primaryKeys())
}

/** Removes entries older than TRASH_DAYS; called once on start. */
export async function purgeOldTrash(now = Date.now()) {
  const old = await db.trash
    .where('deletedAt')
    .below(now - TRASH_DAYS * 24 * 60 * 60 * 1000)
    .primaryKeys()
  if (old.length) await deleteForever(old)
}

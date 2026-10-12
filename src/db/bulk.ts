import { moveBoard } from './boards'
import { db } from './db'
import { descendantIds, moveFolder } from './folders'
import { moveNote } from './notes'
import { restoreTrash, trashBoard, trashFolder, trashNote } from './trash'

// Actions on several sidebar items at once (multi-select)

export type ItemKind = 'note' | 'folder' | 'board'
export interface ItemRef {
  kind: ItemKind
  id: string
}

/** "note:abc" → { kind: 'note', id: 'abc' } (the keys the sidebar uses for its rows) */
export function parseItemKey(key: string): ItemRef {
  const at = key.indexOf(':')
  return { kind: key.slice(0, at) as ItemKind, id: key.slice(at + 1) }
}

/** Moves everything into `folderId` (null = top level). A folder can't go into itself or a folder inside it. */
export async function moveItems(items: ItemRef[], folderId: string | null) {
  const folders = await db.folders.toArray()
  for (const { kind, id } of items) {
    if (kind === 'note') await moveNote(id, folderId)
    else if (kind === 'board') await moveBoard(id, folderId)
    else if (!folderId || !descendantIds(folders, id).has(folderId)) await moveFolder(id, folderId)
  }
}

/**
 * Moves everything to the trash, one entry per item. Folders go first: items inside a selected folder go
 * along with it (and are then skipped). Returns the trash entries, for Undo.
 */
export async function trashItems(items: ItemRef[]): Promise<string[]> {
  const order: ItemKind[] = ['folder', 'board', 'note']
  const sorted = [...items].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))
  const entries: string[] = []
  for (const { kind, id } of sorted) {
    const entry = kind === 'folder' ? await trashFolder(id) : kind === 'board' ? await trashBoard(id) : await trashNote(id)
    if (entry) entries.push(entry)
  }
  return entries
}

/** Undo for trashItems: puts the entries back, last one first */
export async function restoreItems(entryIds: string[]) {
  for (const id of [...entryIds].reverse()) await restoreTrash(id)
}

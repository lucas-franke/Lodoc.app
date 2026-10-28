import { nanoid } from 'nanoid'
import { pruneAssets } from './assets'
import { logChange, logMove, logRename } from './activity'
import { db } from './db'
import type { Board } from './schema'

/** Boards created in this session that haven't been opened yet: their title field takes focus once, like a new note's */
const freshBoards = new Set<string>()

/** True once for a board just created here (the next call returns false) */
export function takeFreshBoard(id: string) {
  return freshBoards.delete(id)
}

export async function createBoard(folderId: string | null = null): Promise<string> {
  const now = Date.now()
  const board: Board = {
    id: nanoid(),
    title: '',
    folderId,
    createdAt: now,
    updatedAt: now,
    viewport: { x: 0, y: 0, zoom: 1 },
    nodes: [],
  }
  await db.boards.add(board)
  freshBoards.add(board.id)
  logChange('Created', { type: 'board', id: board.id, title: '' })
  return board.id
}

/** Moves a board into a folder (null = top level). Not an edit of the board itself. */
export async function moveBoard(id: string, folderId: string | null) {
  const before = await db.boards.get(id)
  await db.boards.update(id, { folderId })
  if (before) logMove({ type: 'board', id, title: boardTitle(before) }, before.folderId, folderId)
}

export async function renameBoard(id: string, title: string) {
  const before = await db.boards.get(id)
  await db.boards.update(id, { title: title.trim(), updatedAt: Date.now() })
  if (before) logRename({ type: 'board', id, title: boardTitle({ title: title.trim() }) }, boardTitle(before), before.createdAt)
}

/**
 * Saves layout changes. Only a change to the items counts as an edit (`updatedAt`);
 * panning and zooming just remember where you were.
 */
export function updateBoard(id: string, changes: Partial<Pick<Board, 'nodes' | 'edges' | 'viewport' | 'noteView'>>) {
  return db.boards.update(id, 'nodes' in changes || 'edges' in changes ? { ...changes, updatedAt: Date.now() } : changes)
}

/** Deletes a board and the images only it uses. Notes are never touched. */
export async function deleteBoard(id: string) {
  await db.transaction('rw', [db.boards, db.notes, db.assets, db.trash], async () => {
    const board = await db.boards.get(id)
    if (!board) return
    await db.boards.delete(id)
    await pruneAssets(board.nodes.map((n) => (n.type === 'image' ? n.assetId : undefined)))
  })
}

export function boardTitle(board: Pick<Board, 'title'>) {
  return board.title.trim() || 'Untitled board'
}

/** Pinned first, then newest first, like new notes. Stable while you work (unlike sorting by last edit). */
export function sortBoards(boards: Board[]): Board[] {
  return [...boards].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.createdAt - a.createdAt)
}

export async function toggleBoardFavorite(id: string) {
  const board = await db.boards.get(id)
  if (board) await db.boards.update(id, { favorite: !board.favorite })
}

export async function toggleBoardPinned(id: string) {
  const board = await db.boards.get(id)
  if (board) await db.boards.update(id, { pinned: !board.pinned })
}

/**
 * A copy of a board, "<title> (copy)", in the same place with the same items and arrows. Note cards still
 * show the same notes (they are references, not copies), and images are shared by id, which is safe: an image
 * is only removed once nothing uses it. Not favorited, pinned like the original. Returns its id.
 */
export async function duplicateBoard(id: string): Promise<string | undefined> {
  const board = await db.boards.get(id)
  if (!board) return undefined
  const now = Date.now()
  const copy: Board = { ...structuredClone(board), id: nanoid(), title: `${boardTitle(board)} (copy)`, favorite: false, createdAt: now, updatedAt: now }
  await db.boards.add(copy)
  logChange(`Duplicated "${boardTitle(board)}"`, { type: 'board', id: copy.id, title: copy.title })
  return copy.id
}

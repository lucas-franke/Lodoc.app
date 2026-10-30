import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'
import type { Board, Note } from '@/db/schema'
import { BoardMapView } from './BoardMapView'

/** The small drawing of a board on its card (BoardMapView), with the notes on it as they are now */
export function BoardMap({ board, className }: { board: Board; className?: string }) {
  const noteIds = board.nodes.flatMap((n) => (n.type === 'note' ? [n.noteId] : []))
  const notes = useLiveQuery(
    async () => new Map((await db.notes.bulkGet(noteIds)).flatMap((n) => (n ? [[n.id, n] as const] : []))),
    [noteIds.join(',')],
    new Map<string, Note>(),
  )
  return <BoardMapView board={board} notes={notes} className={className} />
}

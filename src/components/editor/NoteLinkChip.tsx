import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'
import { noteTitle } from '@/db/notes'
import { openNote } from '@/hooks/useRoute'
import { NoteLinkChipView } from './NoteLinkChipView'

/** How a note link looks in the editor: the linked note's current title (struck through if it was deleted) */
export function NoteLinkChip({ noteId, fallback }: { noteId: string; fallback: string }) {
  const note = useLiveQuery(() => db.notes.get(noteId), [noteId], null)
  return (
    <NoteLinkChipView
      href={`#/note/${encodeURIComponent(noteId)}`}
      title={note ? noteTitle(note) : fallback || 'Untitled'}
      missing={note === undefined}
      onOpen={() => openNote(noteId)}
    />
  )
}

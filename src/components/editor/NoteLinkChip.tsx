import { useLiveQuery } from 'dexie-react-hooks'
import { FileText } from 'lucide-react'
import { db } from '@/db/db'
import { noteTitle } from '@/db/notes'
import { openNote } from '@/hooks/useRoute'

/** How a note link looks in the editor: the linked note's current title (struck through if it was deleted) */
export function NoteLinkChip({ noteId, fallback }: { noteId: string; fallback: string }) {
  const note = useLiveQuery(() => db.notes.get(noteId), [noteId], null)
  const missing = note === undefined
  return (
    <a
      href={`#/note/${encodeURIComponent(noteId)}`}
      data-note-link={noteId}
      onClick={(e) => {
        e.preventDefault()
        if (!missing) openNote(noteId)
      }}
      className={
        missing
          ? 'rounded px-0.5 text-muted-foreground line-through decoration-muted-foreground/60'
          : 'inline-flex items-baseline gap-0.5 rounded px-0.5 font-medium text-foreground underline decoration-muted-foreground/50 underline-offset-2 hover:bg-muted hover:decoration-foreground'
      }
      title={missing ? 'This note was deleted' : undefined}
    >
      <FileText aria-hidden className="size-3.5 self-center text-muted-foreground" />
      {note ? noteTitle(note) : fallback || 'Untitled'}
    </a>
  )
}

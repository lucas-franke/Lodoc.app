import { ListChecks } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Note } from '@/db/schema'
import { checklistProgress } from '@/db/notes'
import { formatDateTime, formatRelative } from '@/lib/format'

/** One quiet line at the bottom of a card, so every card's footer lines up. */
export function CardFooter({ children }: { children: ReactNode }) {
  return <div className="mt-auto flex min-w-0 shrink-0 items-center gap-2 overflow-hidden text-xs text-muted-foreground">{children}</div>
}

/** When the note was edited, how much of its checklist is done, and up to two of its tags */
export function NoteCardFooter({ note }: { note: Note }) {
  const progress = checklistProgress(note)
  return (
    <CardFooter>
      <span className="shrink-0" title={formatDateTime(note.updatedAt)}>
        Edited {formatRelative(note.updatedAt)}
      </span>
      {progress && (
        <span className="flex shrink-0 items-center gap-1" title={`${progress.done} of ${progress.total} done`}>
          <ListChecks aria-hidden className="size-3.5" />
          <span aria-hidden>
            {progress.done}/{progress.total}
          </span>
          <span className="sr-only">
            {progress.done} of {progress.total} done
          </span>
        </span>
      )}
      {/* Tags that don't fit wrap onto a hidden second line, so a tag shows whole or not at all */}
      {note.tags.length > 0 && (
        <span className="flex h-[1.125rem] min-w-0 flex-wrap gap-1 overflow-hidden">
          {note.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="max-w-full shrink-0 truncate rounded-full bg-muted px-1.5 py-0.5 leading-none">
              #{tag}
            </span>
          ))}
        </span>
      )}
    </CardFooter>
  )
}

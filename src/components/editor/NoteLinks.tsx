import { useLiveQuery } from 'dexie-react-hooks'
import { FileText } from 'lucide-react'
import { db } from '@/db/db'
import { noteTitle, sortNotes } from '@/db/notes'

/** Does this note's content contain a link to `targetId`? (a cheap text search over the stored blocks) */
const linksTo = (content: unknown, targetId: string) => JSON.stringify(content).includes(`"noteId":${JSON.stringify(targetId)}`)

/** "Linked from": the notes that link to this one, under its text. */
export function NoteBacklinks({ noteId }: { noteId: string }) {
  const from = useLiveQuery(
    async () => sortNotes((await db.notes.toArray()).filter((n) => n.id !== noteId && linksTo(n.content, noteId))),
    [noteId],
    [],
  )
  if (!from.length) return null
  return (
    <section aria-label="Linked from" className="mt-10 border-t px-[54px] pt-4">
      <h2 className="mb-2 text-xs font-medium text-muted-foreground">Linked from</h2>
      <ul className="space-y-1">
        {from.map((n) => (
          <li key={n.id}>
            <a
              href={`#/note/${encodeURIComponent(n.id)}`}
              className="inline-flex items-center gap-1.5 rounded text-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <FileText aria-hidden className="size-4 text-muted-foreground" />
              {noteTitle(n)}
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}

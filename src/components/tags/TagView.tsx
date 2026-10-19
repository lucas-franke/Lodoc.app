import { useLiveQuery } from 'dexie-react-hooks'
import { Hash } from 'lucide-react'
import { CardSection, NoteCard } from '@/components/folder/FolderView'
import { CardViewToggle } from '@/components/note/CardViewToggle'
import { db } from '@/db/db'
import { sortNotes, tagCounts } from '@/db/notes'
import type { Note } from '@/db/schema'
import { useNoteCardView } from '@/hooks/useNoteCardView'
import { plural } from '@/lib/format'

/** All notes with one tag (#/tag/<name>), plus the other tags to jump between them. */
export function TagView({ tag }: { tag: string }) {
  const notes = useLiveQuery(() => db.notes.toArray(), [], undefined as Note[] | undefined)
  const [cardView, setCardView] = useNoteCardView()
  if (!notes) return null
  const tagged = sortNotes(notes.filter((n) => n.tags.includes(tag)))
  const others = tagCounts(notes).filter((t) => t.tag !== tag)

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pt-10 pb-32 sm:px-12">
      <h1 className="flex items-center gap-2 font-page text-4xl font-bold tracking-tight">
        <Hash aria-hidden className="size-8 shrink-0 text-muted-foreground" strokeWidth={1.5} />
        {tag}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">{plural(tagged.length, 'note')} with this tag</p>
      {others.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Other tags">
          {others.map((t) => (
            <li key={t.tag}>
              <a
                href={`#/tag/${encodeURIComponent(t.tag)}`}
                className="block rounded-full border px-2 py-0.5 text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                #{t.tag} <span className="tabular-nums">{t.count}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      {tagged.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">No note has this tag (any more).</p>
      ) : (
        <CardSection title="Notes" action={<CardViewToggle value={cardView} onChange={setCardView} label="Card view" />}>
          {tagged.map((note) => (
            <NoteCard key={note.id} note={note} view={cardView} />
          ))}
        </CardSection>
      )}
    </div>
  )
}

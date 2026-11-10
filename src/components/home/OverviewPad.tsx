import { useLiveQuery } from 'dexie-react-hooks'
import { lazy, Suspense, useEffect } from 'react'
import { db } from '@/db/db'
import { forgetOverviewNote, getOverviewNote } from '@/db/notes'

const NoteEditor = lazy(() => import('@/components/editor/NoteEditor').then((m) => ({ default: m.NoteEditor })))

/**
 * The scratchpad on the overview: a note of its own, written right here (bold, lists, checklists, "/" for more),
 * for what should stay in view. It is an ordinary note underneath (saved, searchable, with history, in backups),
 * just not listed anywhere else. Its name sits above it like the overview's other sections, since a placeholder
 * alone is no label (and is gone once something is written).
 */
export function OverviewPad() {
  // Looked up in the notes themselves, so it follows when a backup replaces them (null: there is none right now)
  const note = useLiveQuery(async () => (await db.notes.filter((n) => !!n.overview).first()) ?? null, [], undefined)
  useEffect(() => {
    if (note === null) forgetOverviewNote()
    // Makes it the first time (and gives an old one its new name)
    if (!note) void getOverviewNote()
  }, [note])
  return (
    <section aria-labelledby="overview-pad-label" className="mt-6">
      <h2 id="overview-pad-label" className="mb-2 text-base font-semibold">
        Scratchpad
      </h2>
      <div className="min-h-14 rounded-xl border bg-card px-1 focus-within:border-control-border" data-overview-pad>
        {note && (
          <Suspense fallback={null}>
            <NoteEditor key={note.id} note={note} pad />
          </Suspense>
        )}
      </div>
    </section>
  )
}

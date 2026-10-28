import { useLiveQuery } from 'dexie-react-hooks'
import { lazy, Suspense, useEffect, useState } from 'react'
import { db } from '@/db/db'
import { getOverviewNote } from '@/db/notes'

const NoteEditor = lazy(() => import('@/components/editor/NoteEditor').then((m) => ({ default: m.NoteEditor })))

/**
 * Pinned on the overview: a note of its own, written right here (bold, lists, checklists, "/" for more), for
 * what should stay in view. It is an ordinary note underneath (saved, searchable, with history, in backups),
 * just not listed anywhere else.
 */
export function OverviewPad() {
  const [id, setId] = useState<string | null>(null)
  useEffect(() => {
    void getOverviewNote().then(setId)
  }, [])
  const note = useLiveQuery(() => (id ? db.notes.get(id) : undefined), [id])
  return (
    <section aria-label="Pinned on the overview" className="mt-6 min-h-14 rounded-xl border bg-card px-1 focus-within:border-control-border" data-overview-pad>
      {note && (
        <Suspense fallback={null}>
          <NoteEditor key={note.id} note={note} pad />
        </Suspense>
      )}
    </section>
  )
}

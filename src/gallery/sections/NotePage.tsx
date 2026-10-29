import { useLiveQuery } from 'dexie-react-hooks'
import { lazy, Suspense } from 'react'
import { db } from '@/db/db'
import type { Demo } from '../seed'
import { Example, Section } from '../Example'

const NoteEditor = lazy(() => import('@/components/editor/NoteEditor').then((m) => ({ default: m.NoteEditor })))

export function NotePage({ demo }: { demo: Demo }) {
  const note = useLiveQuery(() => db.notes.get(demo.blocksNote), [demo.blocksNote])
  const pad = useLiveQuery(() => db.notes.get(demo.pad), [demo.pad])
  return (
    <Section
      id="note"
      title="Note page"
      intro="A real note with every kind of block. Type in it, select text for the toolbar, type / for the block menu, click a callout's icon to switch its tone."
    >
      <Example id="note-editor" title="A note" source="components/editor/NoteEditor.tsx, index.css" plain>
        <div className="overflow-hidden rounded-xl border bg-background" data-texture-surface="">
          <Suspense fallback={<div className="h-96" />}>{note && <NoteEditor key={note.id} note={note} />}</Suspense>
        </div>
      </Example>
      <Example id="scratchpad" title="Scratchpad" source="components/home/OverviewPad.tsx" plain>
        <div className="max-w-xl rounded-xl border bg-card px-1">
          <Suspense fallback={<div className="h-24" />}>{pad && <NoteEditor key={pad.id} note={pad} pad />}</Suspense>
        </div>
      </Example>
    </Section>
  )
}

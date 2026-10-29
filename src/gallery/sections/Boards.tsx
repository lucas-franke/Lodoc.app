import { useLiveQuery } from 'dexie-react-hooks'
import { lazy, Suspense } from 'react'
import { db } from '@/db/db'
import type { Demo } from '../seed'
import { Example, Section } from '../Example'

const BoardPage = lazy(() => import('@/components/board/BoardPage'))

export function Boards({ demo }: { demo: Demo }) {
  const board = useLiveQuery(() => db.boards.get(demo.board), [demo.board])
  return (
    <Section
      id="boards"
      title="Boards"
      intro="A real board: a frame, note cards, a text, a plain picture and a Polaroid, with arrows. Drag, resize, zoom, add with +, select an item for its toolbar."
    >
      <Example title="A board" source="components/board/BoardPage.tsx, components/board/nodes/" plain>
        <div className="relative h-[40rem] overflow-hidden rounded-xl border max-sm:h-[32rem]">
          <Suspense fallback={null}>{board && <BoardPage key={board.id} board={board} />}</Suspense>
        </div>
      </Example>
    </Section>
  )
}

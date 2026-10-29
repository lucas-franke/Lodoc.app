import { useLiveQuery } from 'dexie-react-hooks'
import { BoardCard, FolderCard, NoteCard } from '@/components/folder/FolderView'
import { db } from '@/db/db'
import { latestNotesIn } from '@/db/notes'
import { NOTE_CARD_VIEWS } from '@/db/schema'
import type { Demo } from '../seed'
import { Caption, Example, Section } from '../Example'

const GRID = 'grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-3 max-sm:grid-cols-2 max-sm:gap-2'
const VIEW_NAMES = { full: 'Full', cover: 'Cover and title', title: 'Title only' } as const

export function Cards({ demo }: { demo: Demo }) {
  const notes = useLiveQuery(() => db.notes.toArray(), [])
  const board = useLiveQuery(() => db.boards.get(demo.board), [demo.board])
  const folder = useLiveQuery(() => db.folders.get(demo.folder), [demo.folder])
  if (!notes) return null
  const byId = (id: string) => notes.find((n) => n.id === id)
  const cardNotes = demo.cardNotes.map(byId).filter((n) => n !== undefined)
  return (
    <Section id="cards" title="Cards" intro="Notes, folders and boards as the overview, folders and tags show them. Their ⋯ menus work on the demo notes.">
      <Example id="note-cards" title="Note cards" source="components/folder/FolderView.tsx, components/note/" plain>
        <div className={GRID}>
          {cardNotes.map((note) => (
            <NoteCard key={note.id} note={note} view="full" />
          ))}
        </div>
      </Example>
      <Example id="card-views" title="Card views" source="components/note/card-views.ts" plain>
        <div className={GRID}>
          {cardNotes[0] &&
            NOTE_CARD_VIEWS.map((view) => (
              <div key={view}>
                <NoteCard note={cardNotes[0]} view={view} />
                <Caption>{VIEW_NAMES[view]}</Caption>
              </div>
            ))}
        </div>
      </Example>
      <Example id="folder-board-cards" title="Folders and boards" source="components/folder/FolderView.tsx, components/board/BoardMap.tsx" plain>
        <div className={GRID}>
          {folder && (
            <FolderCard
              folder={folder}
              notes={notes.filter((n) => n.folderId === folder.id).length}
              folders={0}
              latest={latestNotesIn(notes, folder.id)}
              view="full"
            />
          )}
          {board && <BoardCard board={board} />}
        </div>
      </Example>
    </Section>
  )
}

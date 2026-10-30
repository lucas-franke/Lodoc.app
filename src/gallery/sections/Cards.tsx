import { Copy, ExternalLink, FolderInput, LayoutDashboard, Pencil, Pin, Star, Trash2, Folder as FolderIcon } from 'lucide-react'
import { BoardMapView } from '@/components/board/BoardMapView'
import { CardShell, FolderCardBody, ItemBadges } from '@/components/folder/cards'
import type { MenuEntry } from '@/components/ItemMenu'
import { NoteCardBody, NoteCardTop } from '@/components/note/NoteCardBody'
import { CardFooter } from '@/components/note/NoteCardMeta'
import { NOTE_CARD_VIEWS, type Note } from '@/db/schema'
import { formatRelative, plural } from '@/lib/format'
import { noteTitle } from '@/lib/note-text'
import { BOARD, CARD_NOTES, FOLDER_NOTES, SYNC, TRIP } from '../samples'
import { Caption, Example, Section } from '../Example'

const GRID = 'grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-3 max-sm:grid-cols-2 max-sm:gap-2'
const VIEW_NAMES = { full: 'Full', cover: 'Cover and title', title: 'Title only' } as const

/** A card's ⋯ menu as the app has it; here the items only close the menu */
const nothing = () => undefined
const MENU: MenuEntry[] = [
  { type: 'item', label: 'Open', icon: ExternalLink, onSelect: nothing },
  { type: 'item', label: 'Rename', icon: Pencil, onSelect: nothing },
  { type: 'item', label: 'Favorite', icon: Star, onSelect: nothing },
  { type: 'item', label: 'Pin to top', icon: Pin, onSelect: nothing },
  { type: 'item', label: 'Move to…', icon: FolderInput, onSelect: nothing },
  { type: 'item', label: 'Duplicate', icon: Copy, onSelect: nothing },
  { type: 'separator' },
  { type: 'item', label: 'Delete', icon: Trash2, destructive: true, onSelect: nothing },
]
const notes = new Map([TRIP, SYNC].map((n) => [n.id, n]))

/** A note card as the overview, folders and tags show it (FolderView's NoteCard), on a sample note */
function SampleNoteCard({ note, view }: { note: Note; view: (typeof NOTE_CARD_VIEWS)[number] }) {
  return (
    <CardShell
      href="#cards"
      title={noteTitle(note)}
      entries={MENU}
      rename={false}
      badges={<ItemBadges favorite={note.favorite} pinned={note.pinned} />}
      top={<NoteCardTop note={note} view={view} />}
    >
      <NoteCardBody note={note} view={view} className="max-sm:px-3" />
    </CardShell>
  )
}

export function Cards() {
  return (
    <Section id="cards" title="Cards" intro="Notes, folders and boards as the overview, folders and tags show them. Point at a card for its ⋯ menu, or right-click it.">
      <Example id="note-cards" title="Note cards" source="components/folder/cards.tsx, components/note/" plain>
        <div className={GRID}>
          {CARD_NOTES.map((note) => (
            <SampleNoteCard key={note.id} note={note} view="full" />
          ))}
        </div>
      </Example>
      <Example id="card-views" title="Card views" source="components/note/card-views.ts" plain>
        <div className={GRID}>
          {NOTE_CARD_VIEWS.map((view) => (
            <div key={view}>
              <SampleNoteCard note={TRIP} view={view} />
              <Caption>{VIEW_NAMES[view]}</Caption>
            </div>
          ))}
        </div>
      </Example>
      <Example id="folder-board-cards" title="Folders and boards" source="components/folder/cards.tsx, components/board/BoardMapView.tsx" plain>
        <div className={GRID}>
          <CardShell href="#cards" icon={FolderIcon} title="Travel" entries={MENU} rename={false}>
            <FolderCardBody latest={FOLDER_NOTES} notes={FOLDER_NOTES.length} folders={0} />
          </CardShell>
          <CardShell
            href="#cards"
            icon={LayoutDashboard}
            title={BOARD.title}
            entries={MENU}
            rename={false}
            top={<BoardMapView board={BOARD} notes={notes} className="aspect-[16/7] w-full shrink-0" />}
          >
            <div className="flex flex-1 flex-col px-4 pb-3 max-sm:px-3">
              <CardFooter>
                <span className="truncate">
                  {plural(BOARD.nodes.length, 'item')} · Edited {formatRelative(BOARD.updatedAt)}
                </span>
              </CardFooter>
            </div>
          </CardShell>
        </div>
      </Example>
    </Section>
  )
}

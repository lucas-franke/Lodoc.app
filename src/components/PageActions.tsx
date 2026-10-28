import { MoreHorizontal, Star } from 'lucide-react'
import { RowDropdownMenu } from '@/components/ItemMenu'
import { Tip } from '@/components/Tip'
import { Button } from '@/components/ui/button'
import { toggleBoardFavorite } from '@/db/boards'
import { toggleFavorite } from '@/db/notes'
import type { Board, Folder, Note } from '@/db/schema'
import { useBoardMenuEntries, useFolderMenuEntries, useNoteMenuEntries } from '@/hooks/useItemMenus'
import { cn } from '@/lib/utils'

// Actions for the open page, on the right of the header: the same entries as the sidebar's right-click menu
// (downloads included), so nothing has to be looked up elsewhere.

/** "Rename" on the page itself edits its title in place (after the menu has closed and handed focus back) */
function selectTitle(label: string) {
  setTimeout(() => document.querySelector<HTMLInputElement | HTMLTextAreaElement>(`:is(input, textarea)[aria-label="${label}"]`)?.select(), 50)
}

export function NotePageActions({ note }: { note: Note }) {
  const entries = useNoteMenuEntries(note, { onRename: () => selectTitle('Note title') })
  return (
    <>
      <FavoriteButton favorite={note.favorite} onToggle={() => toggleFavorite(note.id)} />
      <MoreMenu label="Note actions" entries={entries} />
    </>
  )
}

export function FolderPageActions({ folder }: { folder: Folder }) {
  const entries = useFolderMenuEntries(folder, { onRename: () => selectTitle('Folder name') })
  return (
    <>
      <MoreMenu label="Folder actions" entries={entries} />
    </>
  )
}

export function BoardPageActions({ board }: { board: Board }) {
  const entries = useBoardMenuEntries(board, { onRename: () => selectTitle('Board title') })
  return (
    <>
      <FavoriteButton favorite={!!board.favorite} onToggle={() => toggleBoardFavorite(board.id)} />
      <MoreMenu label="Board actions" entries={entries} />
    </>
  )
}

function MoreMenu({ label, entries }: { label: string; entries: Parameters<typeof RowDropdownMenu>[0]['entries'] }) {
  return (
    <RowDropdownMenu
      align="end"
      entries={entries}
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label={label}>
          <MoreHorizontal />
        </Button>
      }
    />
  )
}

/** The star in the page header (notes and boards) */
function FavoriteButton({ favorite, onToggle }: { favorite: boolean; onToggle: () => void }) {
  const label = favorite ? 'Remove from favorites' : 'Add to favorites'
  return (
    <Tip label={label}>
      <Button variant="ghost" size="icon-sm" aria-label={label} aria-pressed={favorite} onClick={onToggle}>
        <Star className={cn(favorite && 'fill-current')} />
      </Button>
    </Tip>
  )
}

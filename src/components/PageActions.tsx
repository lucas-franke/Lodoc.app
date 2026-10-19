import { useLiveQuery } from 'dexie-react-hooks'
import { Download, MoreHorizontal, Star } from 'lucide-react'
import { RowDropdownMenu } from '@/components/ItemMenu'
import { Tip } from '@/components/Tip'
import { Button } from '@/components/ui/button'
import { db } from '@/db/db'
import { descendantIds } from '@/db/folders'
import { toggleFavorite } from '@/db/notes'
import type { Board, Folder, Note } from '@/db/schema'
import { useBoardMenuEntries, useFolderMenuEntries, useNoteMenuEntries } from '@/hooks/useItemMenus'
import { downloadFolderAsZip, downloadNoteAsMarkdown } from '@/lib/downloads'
import { cn } from '@/lib/utils'

// Actions for the open page, on the right of the header next to the light/dark switch: the same entries as
// the sidebar's right-click menu, so nothing has to be looked up elsewhere.

/** "Rename" on the page itself edits its title in place (after the menu has closed and handed focus back) */
function selectTitle(label: string) {
  setTimeout(() => document.querySelector<HTMLInputElement | HTMLTextAreaElement>(`:is(input, textarea)[aria-label="${label}"]`)?.select(), 50)
}

export function NotePageActions({ note }: { note: Note }) {
  const entries = useNoteMenuEntries(note, { onRename: () => selectTitle('Note title') })
  const favLabel = note.favorite ? 'Remove from favorites' : 'Add to favorites'
  return (
    <>
      <Tip label={favLabel}>
        <Button variant="ghost" size="icon-sm" aria-label={favLabel} aria-pressed={note.favorite} onClick={() => toggleFavorite(note.id)}>
          <Star className={cn(note.favorite && 'fill-current')} />
        </Button>
      </Tip>
      <DownloadButton label="Download as Markdown (.md)" onClick={() => void downloadNoteAsMarkdown(note.id)} />
      <MoreMenu label="Note actions" entries={entries} />
    </>
  )
}

export function FolderPageActions({ folder }: { folder: Folder }) {
  const entries = useFolderMenuEntries(folder, { onRename: () => selectTitle('Folder name') })
  // A folder is only offered as a download when it (or a subfolder) holds notes
  const hasNotes = useLiveQuery(
    async () => {
      const ids = descendantIds(await db.folders.toArray(), folder.id)
      return (
        (await db.notes
          .where('folderId')
          .anyOf([...ids])
          .count()) > 0
      )
    },
    [folder.id],
    false,
  )
  return (
    <>
      {hasNotes && (
        <DownloadButton label="Download folder as ZIP (.zip)" onClick={() => void downloadFolderAsZip(folder.id)} />
      )}
      <MoreMenu label="Folder actions" entries={entries} />
    </>
  )
}

export function BoardPageActions({ board }: { board: Board }) {
  const entries = useBoardMenuEntries(board, { onRename: () => selectTitle('Board title') })
  return <MoreMenu label="Board actions" entries={entries} />
}

function DownloadButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Tip label={label}>
      <Button variant="ghost" size="icon-sm" aria-label={label} onClick={onClick}>
        <Download />
      </Button>
    </Tip>
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

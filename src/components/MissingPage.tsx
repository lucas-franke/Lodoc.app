import { useLiveQuery } from 'dexie-react-hooks'
import { FilePlus, FileText, Folder, LayoutGrid, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { boardTitle } from '@/db/boards'
import { createNote, noteTitle } from '@/db/notes'
import { findInTrash, restoreTrash, trashedItem, TRASH_DAYS } from '@/db/trash'
import { activityHash, openNote, type RouteType } from '@/hooks/useRoute'
import { formatRelative } from '@/lib/format'
import { notify } from '@/lib/notify'

const DAY = 24 * 60 * 60 * 1000
const ICONS = { note: FileText, folder: Folder, board: LayoutGrid } as const

/**
 * A link to a note, folder or board that isn't there. If it is in the Trash, it says so and restores it on the
 * spot (the page then shows it, since the address is still its own). Gone for good: the way back to the overview.
 */
export function MissingPage({ type, id }: { type: RouteType; id: string }) {
  // null: not in the Trash; undefined: still looking (nothing is shown for that moment)
  const entry = useLiveQuery(async () => (await findInTrash(type, id)) ?? null, [type, id], undefined)
  if (entry === undefined) return null

  if (!entry) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center" data-missing="gone">
        <h1 className="sr-only">Lodoc</h1>
        <p className="text-sm text-muted-foreground">This {type} no longer exists.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={() => openNote(null)}>Go to Overview</Button>
          <Button variant="outline" onClick={async () => openNote(await createNote())}>
            <FilePlus /> New note
          </Button>
        </div>
      </div>
    )
  }

  const Icon = ICONS[type]
  const name =
    type === 'note'
      ? noteTitle(entry.notes.find((n) => n.id === id)!)
      : type === 'folder'
        ? entry.folders.find((f) => f.id === id)!.name
        : boardTitle(entry.boards.find((b) => b.id === id)!)
  // Deleted along with a folder: restoring brings back that folder, with this in it
  const withFolder = trashedItem(entry).id !== id
  const daysLeft = Math.max(1, Math.ceil((entry.deletedAt + TRASH_DAYS * DAY - Date.now()) / DAY))
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center" data-missing="trash">
      <Icon aria-hidden className="size-7 text-muted-foreground" strokeWidth={1.5} />
      <h1 className="font-page text-lg font-semibold tracking-tight text-balance">{name}</h1>
      <p className="max-w-sm text-sm text-balance text-muted-foreground">
        This {type} is in the Trash{withFolder && `, with the folder "${entry.title}"`}. Deleted {formatRelative(entry.deletedAt)},{' '}
        {daysLeft === 1 ? 'removed tomorrow' : `removed in ${daysLeft} days`}.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Button
          onClick={async () => {
            if (await restoreTrash(entry.id)) notify(`Restored "${entry.title}"`, { logged: true })
          }}
        >
          <RotateCcw /> {withFolder ? 'Restore the folder' : 'Restore'}
        </Button>
        <Button variant="outline" asChild>
          <a href={activityHash('trash')}>Open Trash</a>
        </Button>
      </div>
    </div>
  )
}

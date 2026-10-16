import { useLiveQuery } from 'dexie-react-hooks'
import { FileText, Folder, LayoutGrid, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { db } from '@/db/db'
import type { TrashEntry } from '@/db/schema'
import { deleteForever, emptyTrash, restoreTrash, TRASH_DAYS } from '@/db/trash'
import { useConfirm } from '@/hooks/useConfirm'
import { openBoard, openFolder, openNote } from '@/hooks/useRoute'
import { formatDateTime, formatRelative, plural } from '@/lib/format'

const DAY = 24 * 60 * 60 * 1000
const ICONS = { note: FileText, folder: Folder, board: LayoutGrid } as const

/** Deleted notes, folders and boards, newest first, each restorable until it expires. */
export function TrashView() {
  const entries = useLiveQuery(() => db.trash.orderBy('deletedAt').reverse().toArray(), [], undefined)
  const confirm = useConfirm()
  // "Now" for the days left, taken when the page opens
  const [now] = useState(Date.now)
  if (!entries) return null

  const restore = async (entry: TrashEntry) => {
    if (!(await restoreTrash(entry.id))) return
    const open =
      entry.kind === 'note'
        ? () => openNote(entry.notes[0].id)
        : entry.kind === 'folder'
          ? () => openFolder(entry.folders.find((f) => f.name === entry.title)?.id ?? entry.folders[0].id)
          : () => openBoard(entry.boards[0].id)
    toast(`Restored "${entry.title}"`, { action: { label: 'Open', onClick: open } })
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 pt-12 pb-24 sm:px-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-page text-4xl font-bold tracking-tight">Trash</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Deleted notes, folders and boards stay here for {TRASH_DAYS} days, then they are removed for good.
          </p>
        </div>
        {entries.length > 0 && (
          <Button
            variant="outline"
            onClick={() =>
              confirm({
                title: 'Empty the trash?',
                description: `${plural(entries.length, 'item')} will be deleted for good. This can't be undone.`,
                action: 'Empty trash',
                onConfirm: () => void emptyTrash(),
              })
            }
          >
            <Trash2 /> Empty trash
          </Button>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="mt-16 text-center text-sm text-muted-foreground">The trash is empty.</p>
      ) : (
        <ul className="mt-8 divide-y rounded-lg border" aria-label="Deleted items">
          {entries.map((entry) => {
            const Icon = ICONS[entry.kind]
            const daysLeft = Math.max(1, Math.ceil((entry.deletedAt + TRASH_DAYS * DAY - now) / DAY))
            const details =
              entry.kind === 'folder'
                ? `Folder · ${plural(entry.notes.length, 'note')}`
                : entry.kind === 'board'
                  ? 'Board'
                  : 'Note'
            return (
              <li key={entry.id} className="flex items-center gap-3 px-4 py-3">
                <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{entry.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {details} · deleted <span title={formatDateTime(entry.deletedAt)}>{formatRelative(entry.deletedAt, now)}</span> ·{' '}
                    {daysLeft === 1 ? 'removed tomorrow' : `removed in ${daysLeft} days`}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => void restore(entry)} aria-label={`Restore "${entry.title}"`}>
                  <RotateCcw /> Restore
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  aria-label={`Delete "${entry.title}" for good`}
                  onClick={() =>
                    confirm({
                      title: `Delete "${entry.title}" for good?`,
                      description: "This can't be undone.",
                      action: 'Delete for good',
                      onConfirm: () => void deleteForever([entry.id]),
                    })
                  }
                >
                  Delete
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

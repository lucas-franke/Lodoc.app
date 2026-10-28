import { EmptyArt } from '@/components/EmptyArt'
import { useLiveQuery } from 'dexie-react-hooks'
import { FileText, Folder, LayoutGrid, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { ActivityItem } from '@/db/activity'
import { db } from '@/db/db'
import { deleteForever, emptyTrash, restoreTrash, trashedItem, TRASH_DAYS } from '@/db/trash'
import { useConfirm } from '@/hooks/useConfirm'
import { openBoard, openFolder, openNote } from '@/hooks/useRoute'
import { formatDateTime, formatRelative, plural } from '@/lib/format'
import { notify } from '@/lib/notify'

const DAY = 24 * 60 * 60 * 1000
const ICONS = { note: FileText, folder: Folder, board: LayoutGrid } as const

export const openItem = ({ type, id }: Pick<ActivityItem, 'type' | 'id'>) =>
  type === 'note' ? openNote(id) : type === 'folder' ? openFolder(id) : openBoard(id)

/** Puts a deleted item back and says so, with a button to open it. */
export async function restoreWithMessage(entryId: string) {
  const entry = await restoreTrash(entryId)
  if (!entry) return
  const item = trashedItem(entry)
  notify(`Restored "${entry.title}"`, { logged: true, action: { label: 'Open', onClick: () => openItem(item) } })
}

/** Activity › Deleted (the trash): deleted notes, folders and boards, newest first, each restorable until it expires. */
export function DeletedList() {
  const entries = useLiveQuery(() => db.trash.orderBy('deletedAt').reverse().toArray(), [], undefined)
  const confirm = useConfirm()
  // "Now" for the days left, taken when the page opens
  const [now] = useState(Date.now)
  if (!entries) return null

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Deleted notes, folders and boards stay here for {TRASH_DAYS} days, then they are removed for good.
        </p>
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
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <EmptyArt kind="trash" />
          <p className="text-sm font-medium">All clear</p>
        </div>
      ) : (
        <ul className="mt-6 divide-y rounded-lg border bg-background" aria-label="Deleted items">
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
                <Button variant="outline" size="sm" onClick={() => void restoreWithMessage(entry.id)} aria-label={`Restore "${entry.title}"`}>
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
    </>
  )
}

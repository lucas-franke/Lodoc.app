import { useLiveQuery } from 'dexie-react-hooks'
import { CircleAlert, CircleCheck, FileText, Folder, History, Info, LayoutGrid, RotateCcw, Trash2, type LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { markActivitySeen } from '@/db/activity'
import { boardTitle } from '@/db/boards'
import { db } from '@/db/db'
import { noteTitle } from '@/db/notes'
import type { ActivityEntry } from '@/db/schema'
import { activityHash, type ActivityTab } from '@/hooks/useRoute'
import { formatDateTime, formatRelative } from '@/lib/format'
import { cn } from '@/lib/utils'
import { DeletedList, restoreWithMessage } from './DeletedList'

const TABS: { tab: ActivityTab; label: string }[] = [
  { tab: 'all', label: 'All' },
  { tab: 'changes', label: 'Changes' },
  { tab: 'messages', label: 'Messages' },
  { tab: 'deleted', label: 'Deleted' },
]

const ITEM_ICONS = { note: FileText, folder: Folder, board: LayoutGrid } as const

/**
 * Activity: a changelog of what happened to the notes (created, renamed, moved, deleted, restored, imported,
 * backed up), every message the app showed (they close by themselves, so this is where to read them again),
 * and the trash, as the "Deleted" tab.
 */
export function ActivityView({ tab }: { tab: ActivityTab }) {
  const trashCount = useLiveQuery(() => db.trash.count(), [], 0)
  return (
    <div className="mx-auto w-full max-w-3xl px-6 pt-12 pb-24 sm:px-12">
      <h2 className="font-page text-4xl font-bold tracking-tight">Activity</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        What changed, what was deleted and the messages you were shown, newest first.
      </p>
      <nav aria-label="Filter" className="mt-6 flex gap-1 overflow-x-auto overflow-y-hidden shadow-[inset_0_-1px_0_var(--color-border)]">
        {TABS.map(({ tab: t, label }) => (
          <a
            key={t}
            href={activityHash(t)}
            aria-current={t === tab ? 'page' : undefined}
            className={cn(
              'shrink-0 border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60',
              t === tab && 'border-foreground font-medium text-foreground',
            )}
          >
            {label}
            {t === 'deleted' && trashCount > 0 && <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">{trashCount}</span>}
          </a>
        ))}
      </nav>
      {tab === 'deleted' ? <DeletedList /> : <Timeline tab={tab} />}
    </div>
  )
}

const MATCHES: Record<Exclude<ActivityTab, 'deleted'>, (e: ActivityEntry) => boolean> = {
  all: () => true,
  changes: (e) => e.kind !== 'message',
  messages: (e) => e.kind === 'message',
}

/** Activity lines, grouped by day, with their items' current names and whether deletions can still be undone */
function useTimeline(tab: Exclude<ActivityTab, 'deleted'>) {
  return useLiveQuery(async () => {
    const entries = await db.activity.orderBy('at').reverse().filter(MATCHES[tab]).toArray()
    const ids = (type: string) => [...new Set(entries.flatMap((e) => (e.item?.type === type ? [e.item.id] : [])))]
    const [notes, folders, boards, trash] = await Promise.all([
      db.notes.bulkGet(ids('note')),
      db.folders.bulkGet(ids('folder')),
      db.boards.bulkGet(ids('board')),
      db.trash.bulkGet([...new Set(entries.flatMap((e) => (e.trashId ? [e.trashId] : [])))]),
    ])
    // Current names of the items that still exist
    const names = new Map<string, string>([
      ...notes.flatMap((n) => (n ? [[n.id, noteTitle(n)] as const] : [])),
      ...folders.flatMap((f) => (f ? [[f.id, f.name] as const] : [])),
      ...boards.flatMap((b) => (b ? [[b.id, boardTitle(b)] as const] : [])),
    ])
    const inTrash = new Set(trash.flatMap((t) => (t ? [t.id] : [])))
    // For items that are gone: the latest name any line recorded (a note is created untitled, named later)
    const lastKnown = new Map<string, string>()
    for (const e of entries) if (e.item?.title && !lastKnown.has(e.item.id)) lastKnown.set(e.item.id, e.item.title)
    return { entries, names, inTrash, lastKnown }
  }, [tab])
}

function dayLabel(time: number, now: number) {
  const day = new Date(time).toDateString()
  if (day === new Date(now).toDateString()) return 'Today'
  if (day === new Date(now - 24 * 60 * 60 * 1000).toDateString()) return 'Yesterday'
  return new Date(time).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
}

function Timeline({ tab }: { tab: Exclude<ActivityTab, 'deleted'> }) {
  const data = useTimeline(tab)
  const [now] = useState(Date.now)
  // Opening the page (and anything that arrives while it is open) counts as seen: no more dot in the sidebar
  const newest = data?.entries[0]?.at
  useEffect(() => markActivitySeen(), [newest])
  if (!data) return null
  if (!data.entries.length) {
    return (
      <p className="mt-16 text-center text-sm text-muted-foreground">
        {tab === 'messages' ? 'No messages yet.' : 'Nothing has happened yet.'}
      </p>
    )
  }

  const days: { label: string; entries: ActivityEntry[] }[] = []
  for (const entry of data.entries) {
    const label = dayLabel(entry.at, now)
    if (days.at(-1)?.label === label) days.at(-1)!.entries.push(entry)
    else days.push({ label, entries: [entry] })
  }

  return (
    <div className="mt-6 space-y-8">
      {days.map((day) => (
        <section key={day.label} aria-label={day.label}>
          <h3 className="mb-2 text-xs font-medium text-muted-foreground">{day.label}</h3>
          <ul className="divide-y rounded-lg border">
            {day.entries.map((entry) => (
              <Line
                key={entry.id}
                entry={entry}
                name={entry.item && data.names.get(entry.item.id)}
                lastKnown={entry.item && data.lastKnown.get(entry.item.id)}
                restorable={!!entry.trashId && data.inTrash.has(entry.trashId)}
                now={now}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function iconOf(entry: ActivityEntry): { Icon: LucideIcon; className?: string } {
  if (entry.kind === 'deleted') return { Icon: Trash2 }
  if (entry.kind === 'message') {
    if (entry.level === 'error') return { Icon: CircleAlert, className: 'text-destructive' }
    return { Icon: entry.level === 'success' ? CircleCheck : Info }
  }
  return { Icon: entry.item ? ITEM_ICONS[entry.item.type] : History }
}

function Line({
  entry,
  name,
  lastKnown,
  restorable,
  now,
}: {
  entry: ActivityEntry
  /** The item's current name, if it still exists */
  name?: string
  lastKnown?: string
  restorable: boolean
  now: number
}) {
  const { Icon, className } = iconOf(entry)
  const item = entry.item
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <Icon aria-hidden className={cn('size-4 shrink-0 text-muted-foreground', className)} />
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          {item &&
            (name !== undefined ? (
              <a href={`#/${item.type}/${encodeURIComponent(item.id)}`} className="font-medium underline-offset-4 hover:underline">
                {name}
              </a>
            ) : (
              // Gone (deleted for good, or a note that was never kept): the name it had
              <span className="font-medium">{item.title || lastKnown || 'Untitled'}</span>
            ))}
          {item && <span className="text-muted-foreground"> · </span>}
          <span className={cn(entry.level === 'error' && 'text-destructive')}>{entry.text}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          <span title={formatDateTime(entry.at)}>{formatRelative(entry.at, now)}</span>
          {entry.kind === 'deleted' && entry.trashId && !restorable && !name && ' · no longer in the trash'}
        </p>
      </div>
      {restorable && (
        <Button variant="outline" size="sm" onClick={() => void restoreWithMessage(entry.trashId!)} aria-label={`Restore "${item?.title}"`}>
          <RotateCcw /> Restore
        </Button>
      )}
    </li>
  )
}

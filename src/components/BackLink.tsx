import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft } from 'lucide-react'
import { boardTitle } from '@/db/boards'
import { db } from '@/db/db'
import { noteTitle } from '@/db/notes'
import { useReturnTo, type ReturnSection } from '@/hooks/useRoute'

/** The name of the page behind a hash, as it is now; null for one that no longer exists */
function usePageName(hash: string): string | null | undefined {
  return useLiveQuery(async () => {
    const m = /^#\/(note|folder|board|tag)\/(.+)$/.exec(hash)
    if (!m) {
      if (hash.startsWith('#/activity') || hash === '#/trash') return 'Activity'
      if (hash.startsWith('#/settings')) return 'Settings'
      return 'Overview'
    }
    const id = decodeURIComponent(m[2])
    if (m[1] === 'tag') return `#${id}`
    if (m[1] === 'note') {
      const note = await db.notes.get(id)
      return note ? noteTitle(note) : null
    }
    if (m[1] === 'folder') return (await db.folders.get(id))?.name ?? null
    const board = await db.boards.get(id)
    return board ? boardTitle(board) : null
  }, [hash])
}

/**
 * "← Back to Launch plan" above the title of Settings and Activity: back to the page it was opened from, named
 * so you know where it leads (Escape does the same). To the overview if that page has been deleted since.
 */
export function BackLink({ section }: { section: ReturnSection }) {
  const hash = useReturnTo(section)
  const name = usePageName(hash)
  // null: the page is gone; undefined: its name is still being looked up
  const gone = name === null
  const label = gone ? 'Back to Overview' : name ? `Back to ${name}` : 'Back'
  return (
    <a
      href={gone || !hash ? '#' : hash}
      aria-keyshortcuts="Escape"
      title={name && name.length > 40 ? label : undefined}
      className="-ml-2 mb-4 inline-flex h-8 max-w-full items-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
      data-back-link
    >
      <ArrowLeft aria-hidden className="size-(--icon) shrink-0" />
      <span className="truncate">{label}</span>
      {/* Shown for the eye; screen readers get it from aria-keyshortcuts */}
      <kbd aria-hidden className="ml-1 hidden font-sans text-xs opacity-70 pointer-fine:inline">Esc</kbd>
    </a>
  )
}

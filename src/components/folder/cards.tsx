import { FileText, MoreHorizontal, Pin, Star, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { RowContextMenu, RowDropdownMenu, type MenuEntry } from '@/components/ItemMenu'
import { CardFooter } from '@/components/note/NoteCardMeta'
import { RenameInput } from '@/components/sidebar/RenameInput'
import { Button } from '@/components/ui/button'
import type { Note } from '@/db/schema'
import { formatRelative, plural } from '@/lib/format'
import { noteTitle } from '@/lib/note-text'
import { cn } from '@/lib/utils'

// The parts of the cards on the overview, in folders and tags (FolderView), without the data behind them: the
// components page (src/gallery) builds its sample cards from them too.

/**
 * A card whose title link stretches over the whole card (`after:inset-0`), so the card is one big click target while
 * the "…" button can sit beside the title without nesting interactive elements. `top` (a cover, a board's map) comes
 * above the title, the rest below it.
 */
export function CardShell({
  href,
  icon: Icon,
  title,
  entries,
  rename,
  badges,
  top,
  className,
  children,
}: {
  href: string
  icon?: LucideIcon
  title: string
  entries: MenuEntry[]
  rename: false | { initial: string; onDone: (value: string | null) => void }
  badges?: ReactNode
  top?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <RowContextMenu entries={entries}>
      <div
        className={cn(
          'group/card relative flex min-w-0 flex-col overflow-hidden rounded-lg border bg-card shadow-xs transition-colors hover:border-ring/60 hover:bg-accent/40 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring/60',
          className,
        )}
      >
        {top}
        <div className="relative flex min-h-11 shrink-0 items-start gap-2 py-2.5 pr-11 pl-4 max-sm:pr-10 max-sm:pl-3">
          {Icon && <Icon className="mt-0.5 size-(--icon-sm) shrink-0 text-muted-foreground" />}
          {rename ? (
            <RenameInput initial={rename.initial} onDone={rename.onDone} />
          ) : (
            <a
              href={href}
              // It covers the whole card (::after), so on touch screens a long press there opens the card menu: no link
              // preview or text selection from the browser
              className="line-clamp-2 min-w-0 flex-1 font-page leading-snug font-semibold outline-none after:absolute after:inset-0 after:rounded-lg max-sm:text-sm pointer-coarse:select-none pointer-coarse:[-webkit-touch-callout:none]"
            >
              {title}
            </a>
          )}
          {badges}
          <div className="absolute top-1.5 right-1.5 z-10 hidden rounded-md bg-card/80 backdrop-blur-sm group-focus-within/card:flex group-hover/card:flex pointer-coarse:flex has-data-[state=open]:flex">
            <RowDropdownMenu
              align="end"
              entries={entries}
              trigger={
                <Button variant="ghost" size="icon-xs" className="pointer-coarse:size-9" aria-label={`Actions for ${title}`}>
                  <MoreHorizontal />
                </Button>
              }
            />
          </div>
        </div>
        {children}
      </div>
    </RowContextMenu>
  )
}

/** Favorite and pinned, as small marks after a card's title (filled, so they read as a state, not a button) */
export function ItemBadges({ favorite, pinned }: { favorite?: boolean; pinned?: boolean }) {
  return (
    <>
      {favorite && <Star className="mt-1 size-3.5 shrink-0 fill-current text-muted-foreground" aria-label="Favorite" />}
      {pinned && <Pin className="mt-1 size-3.5 shrink-0 fill-current text-muted-foreground" aria-label="Pinned" />}
    </>
  )
}

/** A folder card below its title: its newest notes, and how many notes (and folders) it has */
export function FolderCardBody({ latest, notes, folders }: { latest: Note[]; notes: number; folders: number }) {
  const edited = latest[0]?.updatedAt
  return (
    <div className="flex flex-1 flex-col gap-2 px-4 pb-3 max-sm:px-3">
      {latest.length > 0 ? (
        <ul className="grid gap-0.5 font-page text-sm leading-relaxed text-muted-foreground">
          {latest.map((note) => (
            <li key={note.id} className="flex min-w-0 items-center gap-1.5">
              <FileText aria-hidden className="size-3.5 shrink-0" />
              <span className="truncate">{noteTitle(note)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="font-page text-sm text-muted-foreground">No notes yet</p>
      )}
      <CardFooter>
        <span className="truncate">
          {plural(notes, 'note')}
          {folders > 0 && ` · ${plural(folders, 'folder')}`}
          {edited !== undefined && ` · Edited ${formatRelative(edited)}`}
        </span>
      </CardFooter>
    </div>
  )
}

import { EmptyArt } from '@/components/EmptyArt'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ChevronDown,
  FileText,
  Folder as FolderIcon,
  FolderOpen,
  LayoutDashboard,
  MoreHorizontal,
  Pin,
  Plus,
  Search,
  Star,
  type LucideIcon,
} from 'lucide-react'
import { Children, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { RowContextMenu, RowDropdownMenu, type MenuEntry } from '@/components/ItemMenu'
import { RenameInput } from '@/components/sidebar/RenameInput'
import { NewMenu } from '@/components/NewMenu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { boardTitle, renameBoard, sortBoards } from '@/db/boards'
import { db } from '@/db/db'
import { renameFolder } from '@/db/folders'
import { createNote, isListed, latestNotesIn, noteText, noteTitle, renameNote, sortNotesBy } from '@/db/notes'
import type { Board, Folder, Note, NoteCardView } from '@/db/schema'
import { useBoardMenuEntries, useFolderMenuEntries, useNoteMenuEntries } from '@/hooks/useItemMenus'
import { BoardMap } from '@/components/board/BoardMap'
import { CardViewToggle } from '@/components/note/CardViewToggle'
import { NoteCardBody, NoteCardTop } from '@/components/note/NoteCardBody'
import { CardFooter } from '@/components/note/NoteCardMeta'
import { useNoteCardView } from '@/hooks/useNoteCardView'
import { useNoteSort } from '@/hooks/useNoteSort'
import { useSectionOpen } from '@/hooks/useSectionOpen'
import { openNote } from '@/hooks/useRoute'
import { sortFolders } from '@/lib/folder-tree'
import { formatDate, formatDateTime, formatRelative, plural } from '@/lib/format'
import { cn } from '@/lib/utils'
import { SortMenu } from './SortMenu'

/** A folder opened as a page: its subfolders, boards and notes as preview cards. */
export function FolderView({ folder }: { folder: Folder }) {
  const folders = useLiveQuery(() => db.folders.toArray(), [], [] as Folder[])
  const notes = useLiveQuery(() => db.notes.filter(isListed).toArray(), [], [] as Note[])
  const boards = useLiveQuery(() => db.boards.toArray(), [], [] as Board[])

  const allSubfolders = sortFolders(folders.filter((f) => f.parentId === folder.id))
  const [sort, setSort] = useNoteSort()
  const [cardView, setCardView] = useNoteCardView()
  const allNotes = sortNotesBy(
    notes.filter((n) => n.folderId === folder.id),
    sort.key,
    sort.direction,
  )
  // The filter field narrows this folder's cards (title and text)
  const [filter, setFilter] = useState('')
  const q = filter.trim().toLowerCase()
  const subfolders = q ? allSubfolders.filter((f) => f.name.toLowerCase().includes(q)) : allSubfolders
  const folderNotes = q ? allNotes.filter((n) => noteText(n).toLowerCase().includes(q)) : allNotes
  const allBoards = sortBoards(boards.filter((b) => b.folderId === folder.id))
  const folderBoards = q ? allBoards.filter((b) => boardTitle(b).toLowerCase().includes(q)) : allBoards
  const counts = (id: string) => ({
    notes: notes.filter((n) => n.folderId === id).length,
    folders: folders.filter((f) => f.parentId === id).length,
    latest: latestNotesIn(notes, id),
  })
  const empty = allSubfolders.length === 0 && allNotes.length === 0 && allBoards.length === 0

  return (
    // Wider on large screens, for more columns of cards
    <div className="mx-auto w-full max-w-4xl px-4 pt-10 pb-32 sm:px-12 2xl:max-w-6xl">
      <div className="flex items-center gap-3">
        <FolderOpen className="size-8 shrink-0 text-muted-foreground" strokeWidth={1.5} />
        <FolderTitle folder={folder} />
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {/* The counts are on the section titles below */}
        <span title={formatDateTime(folder.createdAt)}>Created {formatDate(folder.createdAt)}</span>
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Button onClick={async () => openNote(await createNote(folder.id))}>
          <Plus /> New note
        </Button>
        <NewMenu folderId={folder.id} />
        {!empty && (
          <div className="relative ml-auto w-full sm:w-56">
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-(--icon) -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setFilter('')}
              placeholder="Filter this folder"
              aria-label="Filter this folder"
              className="pl-8"
            />
          </div>
        )}
      </div>

      {empty && (
        <div className="mt-10 flex flex-col items-start gap-3">
          <EmptyArt kind="folder" className="-ml-6" />
          <p className="text-sm text-muted-foreground">
            This folder is empty. Create a note or board here, or move notes and boards in from the sidebar (drag them onto this folder).
          </p>
        </div>
      )}
      {!empty && q && subfolders.length === 0 && folderNotes.length === 0 && folderBoards.length === 0 && (
        <p className="mt-10 text-sm text-muted-foreground">Nothing in this folder matches "{filter.trim()}".</p>
      )}

      {subfolders.length > 0 && (
        <CardSection title="Folders" sectionKey="folder-folders">
          {subfolders.map((sub) => (
            <FolderCard key={sub.id} folder={sub} view={cardView} {...counts(sub.id)} />
          ))}
        </CardSection>
      )}

      {folderBoards.length > 0 && (
        <CardSection title="Boards" sectionKey="folder-boards">
          {folderBoards.map((board) => (
            <BoardCard key={board.id} board={board} />
          ))}
        </CardSection>
      )}

      {folderNotes.length > 0 && (
        <CardSection title="Notes" sectionKey="folder-notes"
          action={
            <div className="flex items-center gap-2">
              <CardViewToggle value={cardView} onChange={setCardView} label="Card view" />
              <SortMenu sort={sort} onChange={setSort} />
            </div>
          }
        >
          {folderNotes.map((note) => (
            <NoteCard key={note.id} note={note} view={cardView} />
          ))}
        </CardSection>
      )}
    </div>
  )
}

export function NoteCard({ note, view }: { note: Note; view: NoteCardView }) {
  const [renaming, setRenaming] = useState(false)
  const entries = useNoteMenuEntries(note, { onRename: () => setRenaming(true) })

  return (
    <CardShell
      href={`#/note/${encodeURIComponent(note.id)}`}
      title={noteTitle(note)}
      entries={entries}
      rename={
        renaming && {
          initial: note.title,
          onDone: (title) => {
            if (title !== null) void renameNote(note.id, title)
            setRenaming(false)
          },
        }
      }
      badges={<ItemBadges favorite={note.favorite} pinned={note.pinned} />}
      top={<NoteCardTop note={note} view={view} />}
    >
      <NoteCardBody note={note} view={view} className="max-sm:px-3" />
    </CardShell>
  )
}

/** Favorite and pinned, as small marks after a card's title (filled, so they read as a state, not a button) */
function ItemBadges({ favorite, pinned }: { favorite?: boolean; pinned?: boolean }) {
  return (
    <>
      {favorite && <Star className="mt-1 size-3.5 shrink-0 fill-current text-muted-foreground" aria-label="Favorite" />}
      {pinned && <Pin className="mt-1 size-3.5 shrink-0 fill-current text-muted-foreground" aria-label="Pinned" />}
    </>
  )
}

export function FolderCard({
  folder,
  notes,
  folders,
  latest,
  view,
}: {
  folder: Folder
  notes: number
  folders: number
  /** Its newest notes (latestNotesIn), listed on the card */
  latest: Note[]
  view: NoteCardView
}) {
  const [renaming, setRenaming] = useState(false)
  const entries = useFolderMenuEntries(folder, { onRename: () => setRenaming(true) })
  const edited = latest[0]?.updatedAt

  return (
    <CardShell
      href={`#/folder/${encodeURIComponent(folder.id)}`}
      icon={FolderIcon}
      title={folder.name}
      entries={entries}
      rename={
        renaming && {
          initial: folder.name,
          onDone: (name) => {
            if (name !== null) void renameFolder(folder.id, name)
            setRenaming(false)
          },
        }
      }
    >
      {view !== 'title' && (
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
      )}
    </CardShell>
  )
}

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

/**
 * A titled group of cards with its count, "Folders (5)"; the title opens and closes it (remembered per `sectionKey`
 * in this browser). The action (view and sort) shows while it is open.
 */
export function CardSection({
  title,
  sectionKey,
  action,
  children,
}: {
  title: string
  sectionKey: string
  action?: ReactNode
  children: ReactNode
}) {
  const [open, setOpen] = useSectionOpen(sectionKey)
  const id = useId()
  const count = Children.toArray(children).length
  return (
    <section className="mt-8">
      <div className="mb-3 flex h-9 items-center justify-between gap-2">
        <h2 className="text-base font-semibold">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={id}
            onClick={() => setOpen(!open)}
            className="-ml-2 flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-accent pointer-coarse:py-2"
          >
            {title} <span className="font-normal text-muted-foreground tabular-nums">({count})</span>
            <ChevronDown aria-hidden className={cn('size-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
          </button>
        </h2>
        {open && action}
      </div>
      {/* Two columns of smaller cards on phones, so more than one note fits on the screen */}
      {open && (
        <div id={id} className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-3 max-sm:grid-cols-2 max-sm:gap-2">
          {children}
        </div>
      )}
    </section>
  )
}

/** Editable folder name, styled like a note title. */
function FolderTitle({ folder }: { folder: Folder }) {
  const [name, setName] = useState(folder.name)
  const ref = useRef<HTMLInputElement>(null)

  // Follow renames made elsewhere (e.g. the sidebar) while not editing here
  useEffect(() => {
    if (document.activeElement !== ref.current) setName(folder.name)
  }, [folder.name])

  const commit = () => {
    if (name.trim() !== folder.name) void renameFolder(folder.id, name)
    if (!name.trim()) setName('Untitled folder')
  }

  return (
    <input
      ref={ref}
      value={name}
      onChange={(e) => setName(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') {
          setName(folder.name)
          requestAnimationFrame(() => ref.current?.blur())
        }
      }}
      placeholder="Untitled folder"
      aria-label="Folder name"
      className="w-full min-w-0 bg-transparent font-page text-4xl font-bold tracking-tight outline-none placeholder:text-muted-foreground"
    />
  )
}

export function BoardCard({ board }: { board: Board }) {
  const [renaming, setRenaming] = useState(false)
  const entries = useBoardMenuEntries(board, { onRename: () => setRenaming(true) })
  const title = boardTitle(board)

  return (
    <CardShell
      href={`#/board/${encodeURIComponent(board.id)}`}
      icon={LayoutDashboard}
      title={title}
      entries={entries}
      rename={
        renaming && {
          initial: board.title,
          onDone: (value) => {
            if (value !== null) void renameBoard(board.id, value)
            setRenaming(false)
          },
        }
      }
      badges={<ItemBadges favorite={board.favorite} pinned={board.pinned} />}
      top={<BoardMap board={board} className="aspect-[16/7] w-full shrink-0" />}
    >
      <div className="flex flex-1 flex-col px-4 pb-3 max-sm:px-3">
        <CardFooter>
          <span className="truncate">
            {plural(board.nodes.length, 'item')} · Edited {formatRelative(board.updatedAt)}
          </span>
        </CardFooter>
      </div>
    </CardShell>
  )
}

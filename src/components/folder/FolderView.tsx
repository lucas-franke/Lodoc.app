import { EmptyArt } from '@/components/EmptyArt'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronDown, Folder as FolderIcon, FolderOpen, LayoutDashboard, Plus, Search } from 'lucide-react'
import { Children, useEffect, useId, useRef, useState, type ReactNode } from 'react'
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
import { CardShell, FolderCardBody, ItemBadges } from './cards'
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
      {view !== 'title' && <FolderCardBody latest={latest} notes={notes} folders={folders} />}
    </CardShell>
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

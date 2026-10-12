import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowRight, FolderPlus, LayoutDashboard, Plus } from 'lucide-react'
import { useState } from 'react'
import { CardSection, CardShell, FolderCard, NoteCard } from '@/components/folder/FolderView'
import { CardViewToggle } from '@/components/note/CardViewToggle'
import { TemplateMenu } from '@/components/TemplateMenu'
import { CardMeta } from '@/components/note/NoteCardMeta'
import { NoteCover } from '@/components/note/NoteCover'
import { Button } from '@/components/ui/button'
import { createBoard, renameBoard, sortBoards } from '@/db/boards'
import { db } from '@/db/db'
import { createFolder } from '@/db/folders'
import { createNote, notePreview, noteTitle, sortNotes } from '@/db/notes'
import type { Board, Folder, Note } from '@/db/schema'
import { useAppearance } from '@/hooks/useAppearance'
import { useBoardMenuEntries } from '@/hooks/useItemMenus'
import { useNoteCardView } from '@/hooks/useNoteCardView'
import { openBoard, openFolder, openNote } from '@/hooks/useRoute'
import { sortFolders } from '@/lib/folder-tree'
import { resolveCover } from '@/lib/cover'
import { formatRelative, plural } from '@/lib/format'
import { readLastNote } from '@/lib/last-note'

const RECENT_COUNT = 8

/** The start page: shows an overview of everything once there is something to show. */
export function HomeView({ empty }: { empty: React.ReactNode }) {
  const notes = useLiveQuery(() => db.notes.toArray(), [], undefined as Note[] | undefined)
  const folders = useLiveQuery(() => db.folders.toArray(), [], undefined as Folder[] | undefined)
  const boards = useLiveQuery(() => db.boards.toArray(), [], undefined as Board[] | undefined)
  const [cardView, setCardView] = useNoteCardView()

  if (!notes || !folders || !boards) return null // still loading
  if (!notes.length && !folders.length && !boards.length) return empty

  const favorites = sortNotes(notes.filter((n) => n.favorite))
  const recent = [...notes].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, RECENT_COUNT)
  const topFolders = sortFolders(folders.filter((f) => f.parentId === null))
  const counts = (id: string) => ({
    notes: notes.filter((n) => n.folderId === id).length,
    folders: folders.filter((f) => f.parentId === id).length,
  })
  const toggle = <CardViewToggle value={cardView} onChange={setCardView} label="Card view" />

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pt-10 pb-32 sm:px-12">
      <h2 className="font-page text-4xl font-bold tracking-tight">Overview</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {plural(notes.length, 'note')} · {plural(folders.length, 'folder')} · {plural(boards.length, 'board')}
      </p>

      {recent.length > 0 && <ContinueCard note={notes.find((n) => n.id === readLastNote()) ?? recent[0]} />}

      <div className="mt-6 flex flex-wrap gap-2">
        <Button variant="outline" onClick={async () => openNote(await createNote())}>
          <Plus /> New note
        </Button>
        <TemplateMenu />
        <Button variant="outline" onClick={async () => openFolder(await createFolder('New folder'))}>
          <FolderPlus /> New folder
        </Button>
        <Button variant="outline" onClick={async () => openBoard(await createBoard())}>
          <LayoutDashboard /> New board
        </Button>
      </div>

      {favorites.length > 0 && (
        <CardSection title="Favorites">
          {favorites.map((note) => (
            <NoteCard key={note.id} note={note} view={cardView} />
          ))}
        </CardSection>
      )}

      {recent.length > 0 && (
        <CardSection title="Recently edited" action={toggle}>
          {recent.map((note) => (
            <NoteCard key={note.id} note={note} view={cardView} />
          ))}
        </CardSection>
      )}

      {topFolders.length > 0 && (
        <CardSection title="Folders">
          {topFolders.map((folder) => (
            <FolderCard key={folder.id} folder={folder} view={cardView} {...counts(folder.id)} />
          ))}
        </CardSection>
      )}

      {boards.length > 0 && (
        <CardSection title="Boards">
          {sortBoards(boards).map((board) => (
            <BoardCard key={board.id} board={board} />
          ))}
        </CardSection>
      )}
    </div>
  )
}

/** The note you had open last (or else the one edited last), as the obvious way back into your work */
function ContinueCard({ note }: { note: Note }) {
  const { autoCover } = useAppearance()
  const cover = resolveCover(note, autoCover)
  const preview = notePreview(note, 140)
  return (
    <a
      href={`#/note/${encodeURIComponent(note.id)}`}
      data-continue
      className="group mt-6 flex items-center gap-4 rounded-xl border bg-card p-3 pr-4 outline-none transition-colors hover:border-ring/60 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring/60"
    >
      {cover ? (
        <NoteCover cover={cover} className="size-16 shrink-0 rounded-lg" />
      ) : (
        <span aria-hidden className="size-16 shrink-0 rounded-lg bg-muted" />
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-muted-foreground">Continue where you left off</span>
        <span className="block truncate font-page text-lg font-semibold">{noteTitle(note)}</span>
        <span className="block truncate text-xs text-muted-foreground">
          Edited {formatRelative(note.updatedAt)}
          {preview && ` · ${preview}`}
        </span>
      </span>
      <ArrowRight aria-hidden className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </a>
  )
}

function BoardCard({ board }: { board: Board }) {
  const [renaming, setRenaming] = useState(false)
  const entries = useBoardMenuEntries(board, { onRename: () => setRenaming(true) })
  const title = board.title.trim() || 'Untitled board'

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
    >
      <div className="flex flex-1 flex-col px-4 pt-1 pb-3">
        <CardMeta
          primary={
            <>
              {plural(board.nodes.length, 'item')} · Edited {formatRelative(board.updatedAt)}
            </>
          }
          created={board.createdAt}
        />
      </div>
    </CardShell>
  )
}

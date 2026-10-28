import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { ArrowRight, CalendarDays, FolderPlus, LayoutDashboard, Plus } from 'lucide-react'
import { BoardCard, CardSection, FolderCard, NoteCard } from '@/components/folder/FolderView'
import { CardViewToggle } from '@/components/note/CardViewToggle'
import { TemplateMenu } from '@/components/TemplateMenu'
import { QuickCapture } from './QuickCapture'
import { WritingDays } from './WritingDays'
import { NoteCover } from '@/components/note/NoteCover'
import { Button } from '@/components/ui/button'
import { createBoard, sortBoards } from '@/db/boards'
import { db } from '@/db/db'
import { createFolder } from '@/db/folders'
import { createNote, notePreview, noteTitle, sortNotes } from '@/db/notes'
import type { Board, Folder, Note } from '@/db/schema'
import { useAppearance } from '@/hooks/useAppearance'
import { useNoteCardView } from '@/hooks/useNoteCardView'
import { openBoard, openFolder, openNote } from '@/hooks/useRoute'
import { sortFolders } from '@/lib/folder-tree'
import { resolveCover } from '@/lib/cover'
import { formatRelative, plural } from '@/lib/format'
import { openTodaysJournal } from '@/lib/journal'
import { readLastNote } from '@/lib/last-note'

const RECENT_COUNT = 8

/** The start page: shows an overview of everything once there is something to show. */
export function HomeView({ empty }: { empty: React.ReactNode }) {
  const notes = useLiveQuery(() => db.notes.toArray(), [], undefined as Note[] | undefined)
  const folders = useLiveQuery(() => db.folders.toArray(), [], undefined as Folder[] | undefined)
  const boards = useLiveQuery(() => db.boards.toArray(), [], undefined as Board[] | undefined)
  const [cardView, setCardView] = useNoteCardView()
  const [hello] = useState(() => greeting(new Date().getHours()))

  if (!notes || !folders || !boards) return null // still loading
  if (!notes.length && !folders.length && !boards.length) return empty

  const favorites = sortNotes(notes.filter((n) => n.favorite))
  const favoriteBoards = sortBoards(boards.filter((b) => b.favorite))
  const recent = [...notes].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, RECENT_COUNT)
  // The note you had open last, or else the latest edit; an empty note isn't worth continuing
  const hasSomething = (n: Note) => n.title !== '' || n.content.length > 0
  const last = notes.find((n) => n.id === readLastNote())
  const continueWith = last && hasSomething(last) ? last : recent.find(hasSomething)
  const topFolders = sortFolders(folders.filter((f) => f.parentId === null))
  const counts = (id: string) => ({
    notes: notes.filter((n) => n.folderId === id).length,
    folders: folders.filter((f) => f.parentId === id).length,
  })
  const toggle = <CardViewToggle value={cardView} onChange={setCardView} label="Card view" />

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pt-12 pb-32 sm:px-12">
      <p className="mb-1 text-sm text-muted-foreground" data-greeting>
        {hello}
      </p>
      <h1 className="font-page text-4xl font-bold tracking-tight">Overview</h1>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-sm text-muted-foreground">
          {[plural(notes.length, 'note'), folders.length > 0 && plural(folders.length, 'folder'), boards.length > 0 && plural(boards.length, 'board')]
            .filter(Boolean)
            .join(' · ')}
        </p>
        <WritingDays notes={notes} />
      </div>

      <QuickCapture />

      {continueWith && <ContinueCard note={continueWith} />}

      <div className="mt-6 flex flex-wrap gap-2">
        <Button onClick={async () => openNote(await createNote())}>
          <Plus /> New note
        </Button>
        <Button variant="outline" onClick={async () => openNote(await openTodaysJournal())}>
          <CalendarDays /> Today's journal
        </Button>
        <TemplateMenu />
        <Button variant="outline" onClick={async () => openFolder(await createFolder('New folder'))}>
          <FolderPlus /> New folder
        </Button>
        <Button variant="outline" onClick={async () => openBoard(await createBoard())}>
          <LayoutDashboard /> New board
        </Button>
      </div>

      {favorites.length + favoriteBoards.length > 0 && (
        <CardSection title="Favorites">
          {favorites.map((note) => (
            <NoteCard key={note.id} note={note} view={cardView} />
          ))}
          {favoriteBoards.map((board) => (
            <BoardCard key={board.id} board={board} />
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

/** A word by time of day above the overview */
function greeting(hour: number) {
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 18) return 'Good afternoon'
  if (hour >= 18 && hour < 23) return 'Good evening'
  return 'Late night writing?'
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

import { useLiveQuery } from 'dexie-react-hooks'
import { FilePlus, PanelLeftOpen } from 'lucide-react'
import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { BoardBreadcrumb } from '@/components/board/BoardBreadcrumb'
import { CommandPalette } from '@/components/CommandPalette'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { AppDnd } from '@/components/dnd/AppDnd'
import { FolderView } from '@/components/folder/FolderView'
import { BoardPageActions, FolderPageActions, NotePageActions } from '@/components/PageActions'
import { AccessibilityMenu } from '@/components/appearance/AccessibilityMenu'
import { AppearanceButton, AppearanceMenu } from '@/components/appearance/AppearanceMenu'
import { HomeView } from '@/components/home/HomeView'
import { Welcome } from '@/components/home/Welcome'
import { openTodaysJournal } from '@/lib/journal'
import { rememberLastNote } from '@/lib/last-note'
import { useNoteHistoryOpen } from '@/lib/note-history'
import { ActivityView } from '@/components/activity/ActivityView'
import { TagView } from '@/components/tags/TagView'
import { ShortcutsDialog } from '@/components/ShortcutsDialog'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { Tip } from '@/components/Tip'
import { Button } from '@/components/ui/button'
import { boardTitle } from '@/db/boards'
import { db } from '@/db/db'
import { createNote, noteTitle } from '@/db/notes'
import { useSidebarSwipe } from '@/hooks/useSidebarSwipe'
import { useDiscardUntouchedNote } from '@/hooks/useDiscardUntouchedNote'
import { useMilestones } from '@/hooks/useMilestones'
import { useMarkdownImport } from '@/hooks/useMarkdownImport'
import { openNote, useActivityTab, useRoute, useTagRoute, type RouteType } from '@/hooks/useRoute'
import { useAppEvent } from '@/lib/app-events'
import { cn } from '@/lib/utils'

// The editor is the bulk of the bundle; load it separately so the shell appears fast
const NoteEditor = lazy(() =>
  import('@/components/editor/NoteEditor').then((m) => ({ default: m.NoteEditor })),
)

// The canvas (React Flow) is its own chunk, loaded only when a board is opened
const BoardPage = lazy(() => import('@/components/board/BoardPage'))

// A note's history (with a read-only editor for the preview), loaded when it is first opened
const NoteHistoryDialog = lazy(() => import('@/components/note/NoteHistoryDialog'))

const isNarrow = () => window.matchMedia('(max-width: 767px)').matches
/** Typing "?" in a field or the editor must not open the shortcut list */
const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
const LOADING = Symbol('loading')

export default function App() {
  const route = useRoute()
  const activityTab = useActivityTab()
  const tagRoute = useTagRoute()
  // A new note that was left untouched isn't kept when you move on
  useDiscardUntouchedNote(route?.type === 'note' ? route.id : null)
  // A quiet word at the 10th, 100th… note and each year of writing here
  useMilestones()
  const markdownImport = useMarkdownImport()
  const historyFor = useNoteHistoryOpen()
  const [sidebarOpen, setSidebarOpen] = useState(() => !isNarrow())
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  // Once the page is scrolled, a hairline under the header marks where the content runs out of view
  // (remembered per page, so a newly opened page starts without it)
  const [scrolledPage, setScrolledPage] = useState<string | null>(null)
  const scrolled = scrolledPage === location.hash
  useAppEvent('open-shortcuts', useCallback(() => setShortcutsOpen(true), []))
  useAppEvent('open-palette', useCallback(() => setPaletteOpen(true), []))
  // useLiveQuery keeps returning the previous result while a new route's query runs, so each
  // result carries the route it belongs to. Otherwise the old note's editor would briefly stay
  // on screen under the new URL, and anything typed in that moment would land in the wrong note.
  const routeKey = route ? `${route.type}:${route.id}` : ''
  const page = useLiveQuery(
    async () => ({
      key: routeKey,
      note: route?.type === 'note' ? await db.notes.get(route.id) : undefined,
      folder: route?.type === 'folder' ? await db.folders.get(route.id) : undefined,
      board: route?.type === 'board' ? await db.boards.get(route.id) : undefined,
    }),
    [routeKey],
    LOADING,
  )
  const loading = page === LOADING || page.key !== routeKey
  const note = loading ? undefined : page.note
  const folder = loading ? undefined : page.folder
  const board = loading ? undefined : page.board
  const current = loading
    ? undefined
    : note
      ? { type: 'note' as const, note }
      : folder
        ? { type: 'folder' as const, folder }
        : board
          ? { type: 'board' as const, board }
          : undefined

  // The overview offers to continue with the note you had open last
  useEffect(() => {
    if (route?.type === 'note') rememberLastNote(route.id)
  }, [route])

  // On small screens the sidebar is an overlay; close it once a page is opened
  useEffect(() => {
    if (route && isNarrow()) setSidebarOpen(false)
  }, [route])

  const onBoard = current?.type === 'board'
  // Boards pan with sideways swipes, so the edge swipe doesn't open the sidebar there
  useSidebarSwipe({ open: sidebarOpen, setOpen: setSidebarOpen, canOpen: !onBoard, enabled: isNarrow })

  // New notes go into the folder you're looking at (or the current note's folder)
  const newNoteFolderId =
    current?.type === 'note' ? current.note.folderId : current?.type === 'folder' ? current.folder.id : null

  useEffect(() => {
    const onKeyDown = async (e: KeyboardEvent) => {
      // An open menu has the keyboard (its own typeahead and Escape), so app shortcuts wait until it closes.
      // Another dialog open (not the palette): only the palette toggle and the sidebar still work.
      if (document.querySelector('[role="menu"]')) return
      const dialog = document.querySelector('[role="dialog"], [role="alertdialog"]')
      const otherDialog = !!dialog && !dialog.querySelector('[cmdk-input]')
      const mod = e.ctrlKey || e.metaKey
      if (otherDialog && !(mod && (e.key === '\\' || e.key.toLowerCase() === 'k'))) return
      if (mod && e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        openNote(await createNote(newNoteFolderId))
      } else if (mod && e.altKey && e.code === 'KeyJ') {
        e.preventDefault()
        openNote(await openTodaysJournal())
      } else if (mod && e.key === '\\') {
        e.preventDefault()
        setSidebarOpen((open) => !open)
      } else if (mod && !e.altKey && e.key.toLowerCase() === 'k') {
        // Leave Ctrl+K to the editor when text is selected there (it creates a link)
        const inEditor = (e.target as HTMLElement | null)?.closest?.('.bn-editor')
        if (inEditor && !window.getSelection()?.isCollapsed) return
        e.preventDefault()
        setPaletteOpen((open) => !open)
      } else if (e.key === '?' && !mod && !isTyping(e.target)) {
        e.preventDefault()
        setShortcutsOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [newNoteFolderId])

  return (
    // On a narrow screen the sidebar covers the board, so close it once a note has been dropped there
    <AppDnd onNoteDroppedOnCanvas={() => isNarrow() && setSidebarOpen(false)}>
      <div data-app-shell className="flex h-dvh overflow-hidden bg-background text-foreground safe-area-padding">
        {sidebarOpen && (
          <>
            <div
              className="fixed inset-y-0 left-0 z-40 floating:p-2 md:relative md:z-auto md:floating:pr-0"
              // the gap around a floating sidebar is part of the page, so it gets the page texture (not on boards)
              data-texture-surface={current?.type === 'board' ? undefined : 'frame'}
            >
              <Sidebar onCollapse={() => setSidebarOpen(false)} />
            </div>
            <div data-sidebar-backdrop className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={() => setSidebarOpen(false)} />
          </>
        )}

        <main
          className={cn('relative flex min-w-0 flex-1 flex-col', !onBoard && 'md:floating:pt-2')}
          data-board={onBoard ? '' : undefined}
          // the texture covers the page; a board (header included) stays plain so it reads as one canvas with dots
          data-texture-surface={onBoard ? undefined : ''}
        >
          {/* Notes, folders and boards show their titles as editable inputs, so they get a real heading for screen
              readers; the other pages (overview, Activity, tags) have a visible h1 of their own */}
          {current && (
            <h1 className="sr-only">
              {current.type === 'note' ? noteTitle(current.note) : current.type === 'folder' ? current.folder.name : boardTitle(current.board)}
            </h1>
          )}
          <header
            className={cn(
              'flex h-12 shrink-0 items-center gap-1 border-b border-transparent px-3 text-sm transition-colors',
              scrolled && !onBoard && 'border-border',
              // On a board the canvas runs behind the header: it floats on top and only its controls take clicks
              onBoard && 'pointer-events-none absolute inset-x-0 top-0 z-10 *:pointer-events-auto md:floating:top-2',
            )}
          >
            {!sidebarOpen && (
              <Tip label="Show sidebar" shortcut="Ctrl \">
                <Button variant="ghost" size="icon-sm" onClick={() => setSidebarOpen(true)} aria-label="Show sidebar">
                  <PanelLeftOpen />
                </Button>
              </Tip>
            )}
            {current?.type === 'note' && (
              <Breadcrumbs folderId={current.note.folderId} current={noteTitle(current.note)} />
            )}
            {current?.type === 'folder' && (
              <Breadcrumbs folderId={current.folder.parentId} current={current.folder.name} />
            )}
            {current?.type === 'board' && <BoardBreadcrumb board={current.board} />}
            <div className="ml-auto flex shrink-0 items-center gap-1">
              {current?.type === 'note' && <NotePageActions note={current.note} />}
              {current?.type === 'folder' && <FolderPageActions folder={current.folder} />}
              {current?.type === 'board' && <BoardPageActions board={current.board} />}
              <AccessibilityMenu />
              <AppearanceButton />
            </div>
          </header>

          {/* Boards are full-bleed and pan/zoom themselves, so the page itself must not scroll */}
          <div
            className={onBoard ? 'min-h-0 flex-1 overflow-hidden' : '@container min-h-0 flex-1 overflow-y-auto'}
            onScroll={(e) => setScrolledPage(e.currentTarget.scrollTop > 4 ? location.hash : null)}
          >
            {loading ? null : current?.type === 'note' ? (
              <Suspense fallback={null}>
                <NoteEditor key={current.note.id} note={current.note} />
              </Suspense>
            ) : current?.type === 'folder' ? (
              <FolderView key={current.folder.id} folder={current.folder} />
            ) : current?.type === 'board' ? (
              <Suspense fallback={null}>
                <BoardPage key={current.board.id} board={current.board} />
              </Suspense>
            ) : activityTab ? (
              <ActivityView tab={activityTab} />
            ) : tagRoute !== null ? (
              <TagView key={tagRoute} tag={tagRoute} />
            ) : route ? (
              <EmptyState missing={route.type} />
            ) : (
              // No page open: an overview once there is content, the welcome before that
              <HomeView empty={<Welcome />} />
            )}
          </div>
        </main>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} newNoteFolderId={newNoteFolderId} />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <AppearanceMenu />
      {markdownImport.element}
      {historyFor && (
        <Suspense fallback={null}>
          <NoteHistoryDialog key={historyFor} noteId={historyFor} />
        </Suspense>
      )}
    </AppDnd>
  )
}

/** A link to a page that has been deleted (or never existed) */
function EmptyState({ missing }: { missing: RouteType }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="sr-only">Lodoc</h1>
      <p className="text-sm text-muted-foreground">This {missing} no longer exists.</p>
      <Button onClick={async () => openNote(await createNote())}>
        <FilePlus /> New note
      </Button>
    </div>
  )
}

import { useDroppable } from '@dnd-kit/core'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, FolderPlus, Hash, History, LayoutGrid, PanelLeftClose, Plus, Search, SquarePen } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Tip } from '@/components/Tip'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { db } from '@/db/db'
import { createBoard, sortBoards } from '@/db/boards'
import { createFolder } from '@/db/folders'
import { createNote, sortNotes, sortNotesManual, tagCounts } from '@/db/notes'
import type { Board, Folder, Note } from '@/db/schema'
import { openBoard, openNote, useActiveBoardId, useActiveFolderId, useActiveNoteId, useActivityTab, useIsHome, useTagRoute } from '@/hooks/useRoute'
import { useRegisterSidebarDnd } from '@/components/dnd/dnd-registry'
import { AppearanceMenu } from './AppearanceMenu'
import { BackupMenu } from './BackupMenu'
import { BoardItem } from './BoardItem'
import { FolderTree } from './FolderTree'
import { NoteItem } from './NoteItem'
import { useSidebarWidth } from '@/hooks/useSidebarWidth'
import { SidebarResizer } from './SidebarResizer'
import { SidebarContext, type SidebarContextValue } from './sidebar-context'
import { rowClass, rowLinkClass } from './row-styles'
import { SelectionBar } from './SelectionBar'
import { parseItemKey } from '@/db/bulk'
import { dndId, useDropIndicator } from './tree-dnd'
import { cn } from '@/lib/utils'
import { holdKeyboard } from '@/lib/keyboard'
import { plural } from '@/lib/format'
import { useActivitySeen } from '@/db/activity'
import { emitAppEvent } from '@/lib/app-events'

const EXPANDED_KEY = 'localnotes:expanded'
const NOT_LOADED: Folder[] = []

function loadExpanded(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(EXPANDED_KEY) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

/** How many recently edited notes the (collapsible) Recent section lists */
const RECENT_COUNT = 5

export function Sidebar({ onCollapse }: { onCollapse: () => void }) {
  const folders = useLiveQuery(() => db.folders.toArray(), [], NOT_LOADED)
  const foldersLoaded = folders !== NOT_LOADED
  const notes = useLiveQuery(() => db.notes.toArray(), [], [] as Note[])
  const boards = useLiveQuery(() => db.boards.toArray(), [], [] as Board[])
  const activeNoteId = useActiveNoteId()
  const activeFolderId = useActiveFolderId()
  const activeBoardId = useActiveBoardId()

  const [expanded, setExpanded] = useState(loadExpanded)
  const [renamingId, setRenamingId] = useState<string | null>(null)

  // Multi-select (Ctrl/⌘-click, Shift-click, or "Select" in a row menu)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const anchor = useRef<string | null>(null)
  const nav = useRef<HTMLElement>(null)
  const clearSelection = useCallback(() => setSelected((prev) => (prev.size ? new Set() : prev)), [])
  const toggleSelected = useCallback((key: string) => {
    anchor.current = key
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])
  const selectClick = useCallback(
    (e: React.MouseEvent, key: string) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        toggleSelected(key)
      } else if (e.shiftKey) {
        e.preventDefault()
        // A range in the order the rows are shown (each item once, wherever it first appears)
        const keys = [...new Set([...(nav.current?.querySelectorAll<HTMLElement>('[data-select-key]') ?? [])].map((el) => el.dataset.selectKey!))]
        const from = keys.indexOf(anchor.current ?? key)
        const to = keys.indexOf(key)
        const range = from < 0 || to < 0 ? [key] : keys.slice(Math.min(from, to), Math.max(from, to) + 1)
        setSelected((prev) => new Set([...prev, ...range]))
      } else clearSelection()
    },
    [toggleSelected, clearSelection],
  )

  const toggleExpanded = useCallback((id: string, open?: boolean) => {
    setExpanded((prev) => {
      const shouldOpen = open ?? !prev.has(id)
      if (shouldOpen === prev.has(id)) return prev
      const next = new Set(prev)
      if (shouldOpen) next.add(id)
      else next.delete(id)
      try {
        localStorage.setItem(EXPANDED_KEY, JSON.stringify([...next]))
      } catch {
        // per-browser convenience only
      }
      return next
    })
  }, [])

  // Read folders through a ref so edits (e.g. a rename) don't re-expand folders the user collapsed
  const foldersRef = useRef(folders)
  useEffect(() => {
    foldersRef.current = folders
  }, [folders])
  const expandPath = useCallback(
    (folderId: string | null) => {
      const seen = new Set<string>()
      const parentOf = (id: string) => foldersRef.current.find((f) => f.id === id)?.parentId ?? null
      for (let id = folderId; id && !seen.has(id); id = parentOf(id)) {
        seen.add(id)
        toggleExpanded(id, true)
      }
    },
    [toggleExpanded],
  )

  // Reveal the open page: expand the folders leading to it and scroll its row into view
  const revealFolderId = activeFolderId ?? notes.find((n) => n.id === activeNoteId)?.folderId ?? null
  useEffect(() => {
    if (!foldersLoaded) return
    expandPath(revealFolderId)
    const frame = requestAnimationFrame(() =>
      document.querySelector('aside [data-active="true"]')?.scrollIntoView({ block: 'nearest' }),
    )
    return () => cancelAnimationFrame(frame)
  }, [revealFolderId, activeNoteId, activeBoardId, foldersLoaded, expandPath])


  const notesByFolder = useMemo(() => {
    const map = new Map<string | null, Note[]>()
    for (const note of notes) map.set(note.folderId, [...(map.get(note.folderId) ?? []), note])
    // Every list in display order (pinned first, then the manual order): rows read their neighbours from it
    for (const [folderId, list] of map) map.set(folderId, sortNotesManual(list))
    return map
  }, [notes])

  const boardsByFolder = useMemo(() => {
    const map = new Map<string | null, Board[]>()
    for (const board of sortBoards(boards)) map.set(board.folderId ?? null, [...(map.get(board.folderId ?? null) ?? []), board])
    return map
  }, [boards])

  const sidebarWidth = useSidebarWidth()
  const isHome = useIsHome()
  const onActivity = useActivityTab() !== null
  const activeTag = useTagRoute()
  // Errors since Activity was last opened get a dot (other messages were seen as they appeared)
  const seen = useActivitySeen()
  const unseenErrors = useLiveQuery(() => db.activity.where('at').above(seen).filter((e) => e.level === 'error').count(), [seen], 0)
  // Like Ctrl+Alt+N: a new note goes into the folder you're in (the open folder, or the open note's folder)
  const targetFolderId = activeFolderId ?? notes.find((n) => n.id === activeNoteId)?.folderId ?? null
  const targetFolder = targetFolderId ? folders.find((f) => f.id === targetFolderId) : undefined
  const newNoteLabel = targetFolder ? `New note in "${targetFolder.name}"` : 'New unfiled note'
  const newNote = async () => openNote(await createNote(targetFolder?.id ?? null))
  const newUnfiledNote = async () => openNote(await createNote())

  const ctx: SidebarContextValue = {
    folders,
    notesByFolder,
    boardsByFolder,
    activeNoteId,
    activeFolderId,
    activeBoardId,
    expanded,
    toggleExpanded,
    renamingId,
    setRenamingId,
    selected,
    toggleSelected,
    selectClick,
  }

  // Only what still exists (an item may have been deleted elsewhere meanwhile)
  const selectedItems = [...selected].map(parseItemKey).filter(({ kind, id }) =>
    kind === 'note' ? notes.some((n) => n.id === id) : kind === 'folder' ? folders.some((f) => f.id === id) : boards.some((b) => b.id === id),
  )

  // Tell the app-level drag layer how to plan and commit drops on the sidebar
  useRegisterSidebarDnd({ folders, notes, onExpand: (id) => toggleExpanded(id, true), selected: selectedItems, clearSelection })

  const favorites = sortNotes(notes.filter((n) => n.favorite))
  const tags = tagCounts(notes)
  const recent = [...notes].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, RECENT_COUNT)
  const unfiled = notesByFolder.get(null) ?? []
  const topBoards = boardsByFolder.get(null) ?? []
  const folderName = (id: string | null) => folders.find((f) => f.id === id)?.name

  return (
    <SidebarContext.Provider value={ctx}>
      <aside
        // w-64 on a small screen (overlay); the chosen width from md up
        data-sidebar-panel
        onKeyDown={(e) => {
          if (e.key === 'Escape' && selected.size && !(e.target as HTMLElement).closest('input')) clearSelection()
        }}
        className="relative flex h-full w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground floating:rounded-xl floating:border floating:shadow-sm md:w-(--sidebar-width)"
        style={{ '--sidebar-width': `${sidebarWidth.width}px` } as React.CSSProperties}
      >
        {/* Same height and padding as the page header, so this toggle and "Show sidebar" sit on the same spot */}
        <div className="flex h-12 shrink-0 items-center gap-1 px-3">
          <Tip label="Hide sidebar" shortcut="Ctrl \">
            <Button variant="ghost" size="icon-sm" onClick={onCollapse} aria-label="Hide sidebar">
              <PanelLeftClose />
            </Button>
          </Tip>
          <span className="flex-1 truncate px-1 text-sm font-semibold tracking-tight">Lodoc</span>
          <Tip label={newNoteLabel} shortcut="Ctrl Alt N">
            <Button variant="ghost" size="icon-sm" onClick={newNote} aria-label="New note" aria-description={newNoteLabel}>
              <SquarePen />
            </Button>
          </Tip>
        </div>

        <div className="space-y-1 px-2 pb-2">
          {/* Opens the command palette (one search for notes, folders, boards and commands) and shows its shortcut */}
          <button
            type="button"
            onClick={() => emitAppEvent('open-palette')}
            aria-label="Search and commands"
            aria-keyshortcuts="Control+K"
            className="flex h-9 w-full items-center gap-2 rounded-md bg-sidebar-accent/70 pr-1.5 pl-2.5 text-sm text-muted-foreground outline-none hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <Search aria-hidden className="size-4 shrink-0" />
            <span className="flex-1 text-left">Search…</span>
            <kbd aria-hidden className="rounded border bg-sidebar px-1.5 py-0.5 font-sans text-xs pointer-coarse:hidden">
              Ctrl K
            </kbd>
          </button>
          <div className={rowClass(isHome)}>
            <a href="#/" aria-current={isHome ? 'page' : undefined} className={rowLinkClass} style={{ paddingLeft: '0.5rem' }}>
              <LayoutGrid className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">Overview</span>
            </a>
          </div>
          <div className={rowClass(onActivity)}>
            <a href="#/activity" aria-current={onActivity ? 'page' : undefined} className={rowLinkClass} style={{ paddingLeft: '0.5rem' }}>
              <History className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">Activity</span>
              {unseenErrors > 0 && !onActivity && (
                <span className="mr-2 size-2 shrink-0 rounded-full bg-destructive" role="status" aria-label={`${plural(unseenErrors, 'new error')}`} />
              )}
            </a>
          </div>
        </div>

        {/* Radix lays the content out as a table that grows with its widest row; make it a plain block so long names are cut off (truncate) and the buttons stay in view */}
        <ScrollArea className="min-h-0 flex-1 [&>[data-slot=scroll-area-viewport]>div]:block!">
          <nav ref={nav} aria-label="Notes and folders" className="px-2 pb-4">
            <>
              {recent.length > 0 && (
                <Section title="Recent" collapsible="recent" defaultCollapsed>
                  {recent.map((note) => (
                    <NoteItem key={note.id} note={note} hint={folderName(note.folderId)} section="recent" />
                  ))}
                </Section>
              )}
              {favorites.length > 0 && (
                <Section title="Favorites" collapsible="favorites">
                  {favorites.map((note) => (
                    <NoteItem key={note.id} note={note} hint={folderName(note.folderId)} section="favorites" />
                  ))}
                </Section>
              )}
              <Section
                title="Folders"
                collapsible="folders"
                drop="folders"
                action={
                  <Tip label="New folder">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={async () => {
                        holdKeyboard()
                        setRenamingId(await createFolder('New folder'))
                      }}
                      aria-label="New folder"
                    >
                      <FolderPlus />
                    </Button>
                  </Tip>
                }
              >
                {folders.length ? <FolderTree /> : <EmptyHint>No folders yet</EmptyHint>}
              </Section>
              <Section
                title="Boards"
                collapsible="boards"
                drop="boards"
                action={
                  <Tip label="New board">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={async () => openBoard(await createBoard())}
                      aria-label="New board"
                    >
                      <Plus />
                    </Button>
                  </Tip>
                }
              >
                {topBoards.length ? (
                  topBoards.map((board) => <BoardItem key={board.id} board={board} />)
                ) : (
                  <EmptyHint>{boards.length ? 'Boards outside folders appear here' : 'No boards yet'}</EmptyHint>
                )}
              </Section>
              <Section
                title="Unfiled"
                collapsible="unfiled"
                drop="notes"
                action={
                  <Tip label="New unfiled note">
                    <Button variant="ghost" size="icon-xs" onClick={newUnfiledNote} aria-label="New unfiled note">
                      <Plus />
                    </Button>
                  </Tip>
                }
              >
                {unfiled.length ? (
                  unfiled.map((note) => <NoteItem key={note.id} note={note} />)
                ) : (
                  <EmptyHint>Notes outside folders appear here</EmptyHint>
                )}
              </Section>
              {tags.length > 0 && (
                <Section title="Tags" collapsible="tags">
                  {tags.map(({ tag, count }) => (
                    <div key={tag} className={rowClass(activeTag === tag)}>
                      <a
                        href={`#/tag/${encodeURIComponent(tag)}`}
                        aria-current={activeTag === tag ? 'page' : undefined}
                        className={rowLinkClass}
                        style={{ paddingLeft: '0.5rem' }}
                      >
                        <Hash className="size-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate">{tag}</span>
                        <span className="pr-1.5 text-xs text-muted-foreground tabular-nums">{count}</span>
                      </a>
                    </div>
                  ))}
                </Section>
              )}
            </>
          </nav>
        </ScrollArea>

        {selectedItems.length > 0 && (
          <SelectionBar
            items={selectedItems}
            folders={folders}
            onClear={clearSelection}
            onMoved={(folderId) => folderId && expandPath(folderId)}
          />
        )}
        <div className="space-y-1 border-t p-2">
          <AppearanceMenu />
          <BackupMenu hasNotes={notes.length > 0} />
        </div>
        <SidebarResizer width={sidebarWidth.width} onResize={sidebarWidth.setWidth} onCommit={sidebarWidth.save} />
      </aside>
    </SidebarContext.Provider>
  )
}

function Section({
  title,
  action,
  drop,
  collapsible,
  defaultCollapsed = false,
  children,
}: {
  title: string
  action?: ReactNode
  /** Makes the section a drop zone for moving items to the top level */
  drop?: 'folders' | 'notes' | 'boards'
  /** Key under which the collapsed state is remembered; without it the section can't be collapsed */
  collapsible?: string
  defaultCollapsed?: boolean
  children: ReactNode
}) {
  const id = dndId('section', drop ?? title)
  const { setNodeRef } = useDroppable({ id, data: { type: 'section', section: drop }, disabled: !drop })
  const highlighted = useDropIndicator(id) === 'inside'
  const [collapsed, setCollapsed] = useCollapsedSection(collapsible, defaultCollapsed)
  return (
    <section ref={setNodeRef} className={cn('mt-4 rounded-md', highlighted && 'bg-sidebar-accent/60 ring-2 ring-primary/50')}>
      <div className="flex h-7 items-center justify-between pr-1 pl-2">
        <h2 className="text-xs font-medium text-muted-foreground">
          {collapsible ? (
            <button
              type="button"
              aria-expanded={!collapsed}
              onClick={() => setCollapsed(!collapsed)}
              className="group/collapse -ml-1 flex items-center gap-0.5 rounded px-1 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              {title}
              <ChevronRight
                aria-hidden
                className={cn(
                  'size-3 opacity-0 transition-transform group-hover/collapse:opacity-100 group-focus-visible/collapse:opacity-100 pointer-coarse:opacity-100',
                  !collapsed && 'rotate-90',
                  collapsed && 'opacity-100',
                )}
              />
            </button>
          ) : (
            title
          )}
        </h2>
        {action}
      </div>
      {/* Some empty space at the end, so there's always room to drop at the top level */}
      {!collapsed && <div className={cn('space-y-px', drop && 'pb-2')}>{children}</div>}
    </section>
  )
}

const COLLAPSED_KEY = 'localnotes:collapsedSections'

/** Remembered per section in this browser */
function useCollapsedSection(key: string | undefined, fallback: boolean): [boolean, (collapsed: boolean) => void] {
  const [all, setAll] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem(COLLAPSED_KEY) ?? '{}') as Record<string, boolean>
    } catch {
      return {}
    }
  })
  const collapsed = key ? (all[key] ?? fallback) : false
  const set = (value: boolean) => {
    if (!key) return
    let next = all
    try {
      next = { ...(JSON.parse(localStorage.getItem(COLLAPSED_KEY) ?? '{}') as Record<string, boolean>), [key]: value }
      localStorage.setItem(COLLAPSED_KEY, JSON.stringify(next))
    } catch {
      next = { ...all, [key]: value }
    }
    setAll(next)
  }
  return [collapsed, set]
}

function EmptyHint({ children }: { children: ReactNode }) {
  return <p className="px-2 py-2 text-xs text-muted-foreground">{children}</p>
}

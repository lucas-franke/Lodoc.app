import { useLiveQuery } from 'dexie-react-hooks'
import {
  ArchiveRestore,
  BookOpen,
  CalendarDays,
  Contrast,
  FilePlus,
  FileText,
  Folder as FolderIcon,
  FolderPlus,
  Hash,
  Keyboard,
  LayoutGrid,
  LayoutTemplate,
  Moon,
  Palette,
  Settings,
  Sun,
  Trash2,
  Waves,
  History,
  type LucideIcon,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command'
import { boardTitle, createBoard } from '@/db/boards'
import { db } from '@/db/db'
import { createFolder } from '@/db/folders'
import { createNote, noteSnippetText, noteText, noteTitle, sortNotes, tagCounts } from '@/db/notes'
import type { Board, Folder, Note } from '@/db/schema'
import { openBoard, openFolder, openNote, openTag, openActivity, useRoute, openSettings } from '@/hooks/useRoute'
import { updateAppearance } from '@/hooks/useAppearance'
import { emitAppEvent } from '@/lib/app-events'
import { reducedMotion } from '@/lib/joy'
import { openGuideNote } from '@/lib/guide'
import { openTodaysJournal } from '@/lib/journal'
import { createFromNote, createFromTemplate, TEMPLATES } from '@/lib/templates'
import { exportProject } from '@/lib/project-file'

type Action = { id: string; label: string; icon: LucideIcon; keywords?: string; shortcut?: string; run: () => void }

/**
 * Ctrl+K: one field to find any note, folder or board (title and text) and to run the app's commands.
 * With an empty field it shows what was edited last.
 */
export function CommandPalette({
  open,
  onOpenChange,
  newNoteFolderId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Where "New note" puts the note (the folder you are in), like Ctrl+Alt+N */
  newNoteFolderId: string | null
}) {
  const [query, setQuery] = useState('')
  const data = useLiveQuery(
    async () => (open ? { notes: await db.notes.toArray(), folders: await db.folders.toArray(), boards: await db.boards.toArray() } : null),
    [open],
    null,
  )
  const { resolvedTheme, setTheme } = useTheme()
  const onBoard = useRoute()?.type === 'board'
  // Opened by a shortcut or a button that isn't its Radix trigger, so remember where focus was and go back
  // there when the palette is dismissed (a command that ran leaves focus to whatever it opened)
  const returnFocus = useRef<HTMLElement | null>(null)
  const ran = useRef(false)
  const visibleHeight = useVisibleHeight(open)
  const close = (o: boolean) => {
    onOpenChange(o)
    if (!o) setQuery('')
  }
  const run = (fn: () => void) => () => {
    ran.current = true
    close(false)
    fn()
  }

  const dark = resolvedTheme === 'dark'
  const highContrast = document.documentElement.dataset.contrast === 'high'
  const actions: Action[] = [
    { id: 'new-note', label: 'New note', icon: FilePlus, shortcut: 'Ctrl Alt N', run: async () => openNote(await createNote(newNoteFolderId)) },
    { id: 'journal', label: "Today's journal", icon: CalendarDays, keywords: 'daily diary today date', shortcut: 'Ctrl Alt J', run: async () => openNote(await openTodaysJournal()) },
    ...TEMPLATES.map((t) => ({ id: 'template-' + t.id, label: 'New ' + t.name.toLowerCase(), icon: t.icon, keywords: 'template ' + t.name, run: async () => openNote(await createFromTemplate(t.id, newNoteFolderId)) })),
    ...(data?.notes ?? []).filter((n) => n.template).map((n) => ({ id: 'own-template-' + n.id, label: `New from "${noteTitle(n)}"`, icon: LayoutTemplate, keywords: 'template', run: async () => openNote(await createFromNote(n.id, newNoteFolderId)) })),
    { id: 'new-folder', label: 'New folder', icon: FolderPlus, run: async () => openFolder(await createFolder('New folder')) },
    { id: 'new-board', label: 'New board', icon: LayoutGrid, keywords: 'canvas', run: async () => openBoard(await createBoard()) },
    ...(onBoard ? [{ id: 'tidy-board', label: 'Tidy up this board', icon: LayoutGrid, keywords: 'arrange grid align layout clean order', run: () => emitAppEvent('tidy-board') }] : []),
    { id: 'theme', label: dark ? 'Switch to light mode' : 'Switch to dark mode', icon: dark ? Sun : Moon, keywords: 'theme dark light', run: () => setTheme(dark ? 'light' : 'dark') },
    { id: 'appearance', label: 'Open Appearance settings', icon: Palette, keywords: 'theme dark light mode font color tint texture settings', run: () => openSettings('appearance') },
    { id: 'settings', label: 'Open Settings', icon: Settings, keywords: 'preferences options', shortcut: 'Ctrl ,', run: () => openSettings() },
    { id: 'backup-settings', label: 'Open Backup settings', icon: ArchiveRestore, keywords: 'automatic folder safe storage', run: () => openSettings('backup') },
    { id: 'contrast', label: highContrast ? 'Turn high contrast off' : 'Turn high contrast on', icon: Contrast, keywords: 'accessibility a11y readable', run: () => updateAppearance({ contrast: highContrast ? 'standard' : 'more' }) },
    { id: 'motion', label: reducedMotion() ? 'Turn reduced motion off' : 'Turn reduced motion on', icon: Waves, keywords: 'accessibility a11y animation', run: () => updateAppearance({ motion: reducedMotion() ? 'full' : 'reduce' }) },
    { id: 'export', label: 'Export all notes', icon: ArchiveRestore, keywords: 'backup save download', run: async () => { await exportProject(); emitAppEvent('backup-exported') } },
    { id: 'import-markdown', label: 'Import Markdown files…', icon: FileText, keywords: 'obsidian notion md zip migrate move', run: () => emitAppEvent('import-markdown-files') },
    { id: 'overview', label: 'Go to Overview', icon: LayoutGrid, keywords: 'home start', run: () => openNote(null) },
    { id: 'activity', label: 'Open Activity', icon: History, keywords: 'changes log history messages notifications', run: () => openActivity() },
    { id: 'trash', label: 'Open Trash', icon: Trash2, keywords: 'deleted restore activity', run: () => openActivity('trash') },
    { id: 'guide', label: 'Getting started guide', icon: BookOpen, keywords: 'help tutorial welcome', run: async () => openNote(await openGuideNote()) },
    { id: 'shortcuts', label: 'Keyboard shortcuts', icon: Keyboard, keywords: 'help keys', shortcut: '?', run: () => emitAppEvent('open-shortcuts') },
  ]

  const q = query.trim().toLowerCase()
  const shownActions = q ? actions.filter((a) => `${a.label} ${a.keywords ?? ''}`.toLowerCase().includes(q)) : actions
  const folderName = (id: string | null) => (id ? data?.folders.find((f) => f.id === id)?.name : undefined)

  let notes: Note[] = []
  let folders: Folder[] = []
  let boards: Board[] = []
  let tags: { tag: string; count: number }[] = []
  if (data && q) {
    notes = sortNotes(data.notes.filter((n) => noteText(n).toLowerCase().includes(q))).slice(0, 8)
    folders = data.folders.filter((f) => f.name.toLowerCase().includes(q)).slice(0, 5)
    boards = data.boards.filter((b) => boardTitle(b).toLowerCase().includes(q)).slice(0, 5)
    const tq = q.replace(/^#/, '')
    tags = tagCounts(data.notes).filter((t) => t.tag.includes(tq)).slice(0, 5)
  }
  // Without a query: the most recently edited notes and boards
  const recent = data && !q
    ? [
        ...data.notes.map((n) => ({ kind: 'note' as const, item: n, at: n.updatedAt })),
        ...data.boards.map((b) => ({ kind: 'board' as const, item: b, at: b.updatedAt })),
      ]
        .sort((a, b) => b.at - a.at)
        .slice(0, 6)
    : []

  return (
    <CommandDialog
      open={open}
      onOpenChange={close}
      title="Command palette"
      description="Search notes, folders and boards, or run a command"
      // Phones: at the top, so the keyboard doesn't cover it (the list below fits what the keyboard leaves free)
      className="max-sm:top-[calc(env(safe-area-inset-top)+0.75rem)] sm:max-w-xl"
      onOpenAutoFocus={() => {
        // Runs before focus moves into the palette
        returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
        ran.current = false
      }}
      onCloseAutoFocus={(e) => {
        const el = returnFocus.current
        if (ran.current || !el?.isConnected) return
        e.preventDefault()
        el.focus()
      }}
    >
      <Command shouldFilter={false} loop>
        <CommandInput placeholder="Search notes or type a command…" value={query} onValueChange={setQuery} />
        <CommandList
          className="max-h-[min(60vh,420px)]"
          style={visibleHeight ? { maxHeight: `min(60vh, 420px, ${visibleHeight}px - 5.5rem - env(safe-area-inset-top))` } : undefined}
        >
          <CommandEmpty>Nothing found for "{query.trim()}"</CommandEmpty>
          {recent.length > 0 && (
            <CommandGroup heading="Recent">
              {recent.map((r) =>
                r.kind === 'note' ? (
                  <NoteItem key={'n' + r.item.id} note={r.item} folder={folderName(r.item.folderId)} onSelect={run(() => openNote(r.item.id))} />
                ) : (
                  <Item key={'b' + r.item.id} value={'board:' + r.item.id} icon={LayoutGrid} onSelect={run(() => openBoard(r.item.id))} hint="Board">
                    {boardTitle(r.item)}
                  </Item>
                ),
              )}
            </CommandGroup>
          )}
          {notes.length > 0 && (
            <CommandGroup heading="Notes">
              {notes.map((n) => (
                <NoteItem key={n.id} note={n} folder={folderName(n.folderId)} query={q} onSelect={run(() => openNote(n.overview ? null : n.id))} />
              ))}
            </CommandGroup>
          )}
          {folders.length > 0 && (
            <CommandGroup heading="Folders">
              {folders.map((f) => (
                <Item key={f.id} value={'folder:' + f.id} icon={FolderIcon} onSelect={run(() => openFolder(f.id))} hint={folderName(f.parentId)}>
                  {f.name}
                </Item>
              ))}
            </CommandGroup>
          )}
          {boards.length > 0 && (
            <CommandGroup heading="Boards">
              {boards.map((b) => (
                <Item key={b.id} value={'board:' + b.id} icon={LayoutGrid} onSelect={run(() => openBoard(b.id))}>
                  {boardTitle(b)}
                </Item>
              ))}
            </CommandGroup>
          )}
          {tags.length > 0 && (
            <CommandGroup heading="Tags">
              {tags.map((t) => (
                <Item key={t.tag} value={'tag:' + t.tag} icon={Hash} onSelect={run(() => openTag(t.tag))} hint={String(t.count)}>
                  {t.tag}
                </Item>
              ))}
            </CommandGroup>
          )}
          {shownActions.length > 0 && (
            <CommandGroup heading="Commands">
              {shownActions.map((a) => (
                <CommandItem key={a.id} value={'action:' + a.id} onSelect={run(a.run)}>
                  <a.icon />
                  {a.label}
                  {a.shortcut && <CommandShortcut>{a.shortcut}</CommandShortcut>}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}

function Item({
  value,
  icon: Icon,
  onSelect,
  hint,
  children,
}: {
  value: string
  icon: LucideIcon
  onSelect: () => void
  hint?: string
  children: ReactNode
}) {
  return (
    <CommandItem value={value} onSelect={onSelect}>
      <Icon />
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {hint && <span className="shrink-0 text-xs text-muted-foreground">{hint}</span>}
    </CommandItem>
  )
}

/** A note with its folder, and (while searching) the text around the first match */
function NoteItem({ note, folder, query, onSelect }: { note: Note; folder?: string; query?: string; onSelect: () => void }) {
  const title = noteTitle(note)
  const excerpt = query && !title.toLowerCase().includes(query) ? excerptAround(noteSnippetText(note), query) : null
  return (
    <CommandItem value={'note:' + note.id} onSelect={onSelect} className="items-start">
      <FileText className="mt-0.5" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate">{query ? <Highlight text={title} query={query} /> : title}</span>
          {folder && <span className="shrink-0 text-xs text-muted-foreground">{folder}</span>}
        </span>
        {excerpt && (
          <span className="block truncate text-xs text-muted-foreground">
            <Highlight text={excerpt} query={query!} />
          </span>
        )}
      </span>
    </CommandItem>
  )
}

/** About 60 characters around the first match, so the match is visible in one line */
function excerptAround(text: string, query: string) {
  const i = text.toLowerCase().indexOf(query)
  if (i < 0) return null
  const start = Math.max(0, i - 24)
  const flat = text.slice(start, i + query.length + 40).replace(/\s+/g, ' ')
  return (start > 0 ? '…' : '') + flat
}

function Highlight({ text, query }: { text: string; query: string }) {
  const i = text.toLowerCase().indexOf(query)
  if (i < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-sm bg-amber-200/70 px-0.5 text-foreground dark:bg-amber-400/30">{text.slice(i, i + query.length)}</mark>
      {text.slice(i + query.length)}
    </>
  )
}

/**
 * On phones, the height of what the keyboard leaves visible (the visual viewport), while the palette is open;
 * undefined elsewhere. The page itself doesn't shrink for the keyboard, so CSS alone can't tell.
 */
function useVisibleHeight(open: boolean) {
  const [height, setHeight] = useState<number>()
  useEffect(() => {
    const vv = window.visualViewport
    if (!open || !vv || !window.matchMedia('(max-width: 39.99rem)').matches) return
    const update = () => setHeight(vv.height)
    update()
    vv.addEventListener('resize', update)
    return () => {
      vv.removeEventListener('resize', update)
      setHeight(undefined)
    }
  }, [open])
  return height
}

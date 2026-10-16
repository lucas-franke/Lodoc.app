import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Download,
  ExternalLink,
  FolderInput,
  FolderOpen,
  FolderPlus,
  LayoutDashboard,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Star,
  StarOff,
  Trash2,
} from 'lucide-react'
import { notify } from '@/lib/notify'
import type { MenuEntry } from '@/components/ItemMenu'
import { db } from '@/db/db'
import { holdKeyboard } from '@/lib/keyboard'
import { boardTitle, createBoard, moveBoard } from '@/db/boards'
import { duplicateFolder, duplicateNote } from '@/db/duplicate'
import { createFolder, descendantIds, moveFolder } from '@/db/folders'
import { createNote, moveNote, noteTitle, toggleFavorite, togglePinned } from '@/db/notes'
import { shiftFolder, shiftNote } from '@/db/order'
import { restoreTrash, trashBoard, trashFolder, trashNote } from '@/db/trash'
import type { Board, Folder, Note } from '@/db/schema'
import { openBoard, openFolder, openNote, useRoute } from '@/hooks/useRoute'
import { flattenFolders } from '@/lib/folder-tree'
import { downloadFolderAsZip, downloadNoteAsMarkdown } from '@/lib/downloads'
import type { CanReorder } from '@/lib/reorder'

// Shared by sidebar rows and folder-view cards so both offer the same actions.

/** Deleting moves to the trash, so there is no confirmation: the toast offers Undo instead. */
function announceTrash(entryId: string, title: string, reopen: () => void) {
  notify(`Moved "${title}" to Trash`, {
    logged: true,
    action: {
      label: 'Undo',
      onClick: async () => {
        if (await restoreTrash(entryId)) reopen()
      },
    },
  })
}

function useAllFolders() {
  return useLiveQuery(() => db.folders.toArray(), [], [] as Folder[])
}

/**
 * "Move to…" submenu; `exclude` hides targets that are not allowed (the folder itself and its descendants).
 * Returns nothing when there is nowhere to move to (e.g. no folders yet), so the menu doesn't offer it.
 */
function moveToEntries(
  folders: Folder[],
  current: string | null,
  onMove: (folderId: string | null) => void,
  exclude: Set<string> = new Set(),
): MenuEntry[] {
  const targets = flattenFolders(folders).filter(({ folder }) => !exclude.has(folder.id) && folder.id !== current)
  const entries: MenuEntry[] = [
    ...(current !== null ? [{ type: 'item' as const, label: 'No folder', onSelect: () => onMove(null) }] : []),
    ...targets.map(({ folder, depth }) => ({
      type: 'item' as const,
      label: folder.name,
      icon: FolderOpen,
      indent: depth,
      onSelect: () => onMove(folder.id),
    })),
  ]
  return entries.length ? [{ type: 'sub', label: 'Move to', icon: FolderInput, entries }] : []
}

/**
 * "Move up / down": the keyboard and switch-access alternative to dragging in the sidebar.
 * Only the directions that do something are offered (nothing at all for the only item in a list).
 */
function reorderEntries(shift: (delta: -1 | 1) => void, can: CanReorder | undefined): MenuEntry[] {
  return [
    ...(can?.up ? [{ type: 'item' as const, label: 'Move up', icon: ArrowUp, onSelect: () => shift(-1) }] : []),
    ...(can?.down ? [{ type: 'item' as const, label: 'Move down', icon: ArrowDown, onSelect: () => shift(1) }] : []),
  ]
}

/** "Rename" opens an inline text field; on a phone the keyboard has to be requested during the tap */
const renameEntry = (onRename: () => void): MenuEntry => ({
  type: 'item',
  label: 'Rename',
  icon: Pencil,
  onSelect: () => {
    holdKeyboard()
    onRename()
  },
})

export function useNoteMenuEntries(
  note: Note,
  {
    onRename,
    onMoved,
    reorder,
  }: {
    onRename: () => void
    onMoved?: (folderId: string | null) => void
    /** Which "Move up / down" directions are possible (only where the manual order is shown, i.e. the sidebar) */
    reorder?: CanReorder
  },
): MenuEntry[] {
  const folders = useAllFolders()
  const route = useRoute()

  return [
    renameEntry(onRename),
    {
      type: 'item',
      label: note.favorite ? 'Remove from favorites' : 'Add to favorites',
      icon: note.favorite ? StarOff : Star,
      onSelect: () => toggleFavorite(note.id),
    },
    {
      type: 'item',
      label: note.pinned ? 'Unpin' : 'Pin to top',
      icon: note.pinned ? PinOff : Pin,
      onSelect: () => togglePinned(note.id),
    },
    {
      type: 'item',
      label: 'Duplicate',
      icon: Copy,
      onSelect: async () => {
        if (await duplicateNote(note.id)) notify(`Duplicated "${noteTitle(note)}"`, { level: 'success', logged: true })
      },
    },
    { type: 'item', label: 'Download as .md', icon: Download, onSelect: () => void downloadNoteAsMarkdown(note.id) },
    ...moveToEntries(folders, note.folderId, (folderId) => {
      void moveNote(note.id, folderId)
      onMoved?.(folderId)
    }),
    ...reorderEntries((delta) => void shiftNote(note.id, delta), reorder),
    { type: 'separator' },
    {
      type: 'item',
      label: 'Delete',
      icon: Trash2,
      destructive: true,
      onSelect: async () => {
        const wasOpen = route?.type === 'note' && route.id === note.id
        const entry = await trashNote(note.id)
        if (wasOpen) openNote(null)
        if (entry) announceTrash(entry, noteTitle(note), () => wasOpen && openNote(note.id))
      },
    },
  ]
}

export function useFolderMenuEntries(
  folder: Folder,
  {
    onRename,
    onNewSubfolder = openFolder,
    onBeforeCreate,
    onMoved,
    reorder,
  }: {
    onRename: () => void
    /** Which "Move up / down" directions are possible (only in the sidebar) */
    reorder?: CanReorder
    /** What to do with a freshly created subfolder (default: open it) */
    onNewSubfolder?: (id: string) => void
    /** Called before a note/subfolder is created in this folder, e.g. to expand it in the sidebar */
    onBeforeCreate?: () => void
    onMoved?: (parentId: string | null) => void
  },
): MenuEntry[] {
  const folders = useAllFolders()
  // Folders that hold notes (cheap: just the index keys), to offer a download only when there is something in it
  const withNotes = useLiveQuery(() => db.notes.orderBy('folderId').uniqueKeys(), [], [])
  const hasNotes = useMemo(() => {
    const ids = new Set(withNotes as string[])
    return [...descendantIds(folders, folder.id)].some((id) => ids.has(id))
  }, [withNotes, folders, folder.id])
  const route = useRoute()

  const alreadyOpen = route?.type === 'folder' && route.id === folder.id

  return [
    // Nothing to offer for the folder you are looking at
    ...(alreadyOpen ? [] : [{ type: 'item' as const, label: 'Open', icon: ExternalLink, onSelect: () => openFolder(folder.id) }]),
    { type: 'separator' },
    {
      type: 'item',
      label: 'New note',
      icon: Plus,
      onSelect: async () => {
        onBeforeCreate?.()
        openNote(await createNote(folder.id))
      },
    },
    {
      type: 'item',
      label: 'New board',
      icon: LayoutDashboard,
      onSelect: async () => {
        onBeforeCreate?.()
        openBoard(await createBoard(folder.id))
      },
    },
    {
      type: 'item',
      label: 'New subfolder',
      icon: FolderPlus,
      onSelect: async () => {
        // The sidebar names a new subfolder right away (the default just opens it)
        if (onNewSubfolder !== openFolder) holdKeyboard()
        onBeforeCreate?.()
        onNewSubfolder(await createFolder('New folder', folder.id))
      },
    },
    { type: 'separator' },
    renameEntry(onRename),
    {
      type: 'item',
      label: 'Duplicate',
      icon: Copy,
      onSelect: async () => {
        if (await duplicateFolder(folder.id)) notify(`Duplicated folder "${folder.name}" with its contents`, { level: 'success', logged: true })
      },
    },
    ...(hasNotes
      ? [{ type: 'item' as const, label: 'Download as .zip', icon: Download, onSelect: () => void downloadFolderAsZip(folder.id) }]
      : []),
    ...moveToEntries(
      folders,
      folder.parentId,
      (parentId) => {
        void moveFolder(folder.id, parentId)
        onMoved?.(parentId)
      },
      descendantIds(folders, folder.id),
    ),
    ...reorderEntries((delta) => void shiftFolder(folder.id, delta), reorder),
    { type: 'separator' },
    {
      type: 'item',
      label: 'Delete',
      icon: Trash2,
      destructive: true,
      onSelect: async () => {
        const removed = descendantIds(await db.folders.toArray(), folder.id)
        const activeNote = route?.type === 'note' ? await db.notes.get(route.id) : undefined
        const entry = await trashFolder(folder.id)
        // Leave the page if it was inside what we just deleted (and come back to it on Undo)
        const insideFolder = route?.type === 'folder' && removed.has(route.id)
        const insideNote = activeNote?.folderId != null && removed.has(activeNote.folderId)
        const back = route ? `#/${route.type}/${encodeURIComponent(route.id)}` : ''
        if (insideFolder || insideNote) openNote(null)
        if (entry) announceTrash(entry, folder.name, () => (insideFolder || insideNote) && (window.location.hash = back))
      },
    },
  ]
}

export function useBoardMenuEntries(
  board: Board,
  { onRename, onMoved }: { onRename: () => void; onMoved?: (folderId: string | null) => void },
): MenuEntry[] {
  const folders = useAllFolders()
  const route = useRoute()

  return [
    renameEntry(onRename),
    ...moveToEntries(folders, board.folderId ?? null, (folderId) => {
      void moveBoard(board.id, folderId)
      onMoved?.(folderId)
    }),
    { type: 'separator' },
    {
      type: 'item',
      label: 'Delete',
      icon: Trash2,
      destructive: true,
      onSelect: async () => {
        const wasOpen = route?.type === 'board' && route.id === board.id
        const entry = await trashBoard(board.id)
        if (wasOpen) openNote(null)
        if (entry) announceTrash(entry, boardTitle(board), () => wasOpen && openBoard(board.id))
      },
    },
  ]
}

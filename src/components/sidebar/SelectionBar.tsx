import { FolderInput, FolderOpen, Trash2, X } from 'lucide-react'
import { notify } from '@/lib/notify'
import { Tip } from '@/components/Tip'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { moveItems, restoreItems, trashItems, type ItemRef } from '@/db/bulk'
import { db } from '@/db/db'
import { descendantIds } from '@/db/folders'
import type { Folder } from '@/db/schema'
import { openNote, useRoute } from '@/hooks/useRoute'
import { flattenFolders } from '@/lib/folder-tree'
import { plural } from '@/lib/format'

/** Shown while sidebar items are selected (Ctrl/⌘- or Shift-click, or "Select" in a row menu): act on all of them. */
export function SelectionBar({
  items,
  folders,
  onClear,
  onMoved,
}: {
  items: ItemRef[]
  folders: Folder[]
  onClear: () => void
  onMoved: (folderId: string | null) => void
}) {
  const route = useRoute()
  // A folder can't go into itself or anything inside it
  const blocked = new Set(items.filter((i) => i.kind === 'folder').flatMap((i) => [...descendantIds(folders, i.id)]))
  const targets = flattenFolders(folders).filter(({ folder }) => !blocked.has(folder.id))
  const count = plural(items.length, 'item')

  const move = async (folderId: string | null) => {
    await moveItems(items, folderId)
    onClear()
    onMoved(folderId)
  }

  const remove = async () => {
    const entries = await trashItems(items)
    onClear()
    // Leave the open page if it went to the trash too
    if (route && !(await (route.type === 'note' ? db.notes : route.type === 'folder' ? db.folders : db.boards).get(route.id))) {
      openNote(null)
    }
    if (entries.length) {
      notify(`Moved ${count} to Trash`, { logged: true, action: { label: 'Undo', onClick: () => void restoreItems(entries) } })
    }
  }

  return (
    <div
      role="toolbar"
      aria-label="Selected items"
      data-selection-bar
      className="mx-2 mb-2 flex items-center gap-0.5 rounded-lg border bg-popover p-1 pl-3 text-sm text-popover-foreground shadow-sm"
    >
      <span className="min-w-0 flex-1 truncate font-medium" aria-live="polite">
        {items.length} selected
      </span>
      <DropdownMenu>
        <Tip label="Move to…">
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Move selected items to">
              <FolderInput />
            </Button>
          </DropdownMenuTrigger>
        </Tip>
        <DropdownMenuContent side="top" align="end" className="max-h-80 w-56">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Move {count} to</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => void move(null)}>No folder</DropdownMenuItem>
          {targets.length > 0 && <DropdownMenuSeparator />}
          {targets.map(({ folder, depth }) => (
            <DropdownMenuItem key={folder.id} onSelect={() => void move(folder.id)} style={{ paddingLeft: `${0.5 + depth * 0.75}rem` }}>
              <FolderOpen /> <span className="truncate">{folder.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Tip label="Move to Trash">
        <Button variant="ghost" size="icon-sm" aria-label="Delete selected items" onClick={() => void remove()}>
          <Trash2 />
        </Button>
      </Tip>
      <Tip label="Clear selection" shortcut="Esc">
        <Button variant="ghost" size="icon-sm" aria-label="Clear selection" onClick={onClear}>
          <X />
        </Button>
      </Tip>
    </div>
  )
}

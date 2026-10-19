import { FileText, Inbox, LayoutTemplate, MoreHorizontal, Pin } from 'lucide-react'
import { useCollectNoteId } from '@/lib/collect'
import { RowContextMenu, RowDropdownMenu } from '@/components/ItemMenu'
import { Button } from '@/components/ui/button'
import { noteTitle, renameNote } from '@/db/notes'
import type { Note } from '@/db/schema'
import { useNoteMenuEntries } from '@/hooks/useItemMenus'
import { canReorderNote } from '@/lib/reorder'
import { cn } from '@/lib/utils'
import { RenameInput } from './RenameInput'
import { rowActionButtonClass, rowActionsClass, rowClass, rowLinkClass, rowStatusClass } from './row-styles'
import { useSidebar, withSelectEntry } from './sidebar-context'
import { DropLine } from './DropLine'
import { dndId, useTreeItem } from './tree-dnd'

export function NoteItem({
  note,
  depth = 0,
  hint,
  section = 'tree',
}: {
  note: Note
  depth?: number
  hint?: string
  /** Which list the row is in; a note can appear in several (e.g. Favorites and its folder) */
  section?: string
}) {
  const { activeNoteId, notesByFolder, toggleExpanded, renamingId, setRenamingId, selected, toggleSelected, selectClick } =
    useSidebar()
  const selectKey = dndId('note', note.id)
  const isSelected = selected.has(selectKey)
  const active = note.id === activeNoteId
  const renameKey = `${section}:${note.id}`
  const collecting = useCollectNoteId() === note.id
  const renaming = renamingId === renameKey

  const menu = useNoteMenuEntries(note, {
    onRename: () => setRenamingId(renameKey),
    onMoved: (folderId) => folderId && toggleExpanded(folderId, true),
    // Only rows in the folder tree / "Notes" list have a manual order to move within
    reorder: section === 'tree' ? canReorderNote(notesByFolder.get(note.folderId) ?? [], note) : undefined,
  })
  const entries = withSelectEntry(menu, isSelected, () => toggleSelected(selectKey))
  // Inside the tree, line the icon up with sibling folder icons (which sit after a 1.75rem chevron)
  const indentLeft = depth === 0 ? '0.5rem' : `${2 + depth * 0.75}rem`
  const indent = { paddingLeft: indentLeft }

  // Every row can be dragged (e.g. onto a board), but only rows in the folder tree / "Notes" list are
  // targets for reordering; Favorites and Recent show a different order.
  const { setNodeRef, listeners, isDragging, indicator } = useTreeItem(
    section === 'tree' ? dndId('note', note.id) : `${section}:${note.id}`,
    { type: 'note', note },
    { dragDisabled: renaming, dropDisabled: section !== 'tree' || renaming },
  )

  return (
    <RowContextMenu entries={entries}>
      <div
        ref={setNodeRef}
        {...listeners}
        data-active={active}
        // Shift-click ranges follow the tree (Favorites and Recent repeat notes in another order)
        data-select-key={section === 'tree' ? selectKey : undefined}
        data-selected={isSelected || undefined}
        className={rowClass(active, false, isDragging, isSelected)}
      >
        <DropLine position={indicator} indent={indentLeft} />
        {renaming ? (
          <div className="flex h-full min-w-0 flex-1 items-center gap-2" style={indent}>
            <NoteIcon collecting={collecting} template={!!note.template} />
            <RenameInput
              initial={note.title}
              onDone={(title) => {
                if (title !== null) void renameNote(note.id, title)
                setRenamingId(null)
              }}
            />
          </div>
        ) : (
          <a
            href={`#/note/${encodeURIComponent(note.id)}`}
            aria-current={active ? 'page' : undefined}
            className={rowLinkClass}
            style={indent}
            // The row is dragged with dnd-kit; stop the browser's own link dragging
            draggable={false}
            onClick={(e) => selectClick(e, selectKey)}
          >
            <NoteIcon collecting={collecting} template={!!note.template} />
            <span className="min-w-0 flex-1 truncate">
              {noteTitle(note)}
              {hint && <span className="ml-1.5 text-xs font-normal text-muted-foreground">{hint}</span>}
              {isSelected && <span className="sr-only">, selected</span>}
            </span>
            {note.pinned && (
              <Pin className={cn('mr-1 size-3.5 shrink-0 text-muted-foreground', rowStatusClass)} aria-label="Pinned" />
            )}
          </a>
        )}
        <div className={rowActionsClass}>
          <RowDropdownMenu
            entries={entries}
            trigger={
              <Button variant="ghost" size="icon-xs" className={rowActionButtonClass} aria-label={`Actions for ${noteTitle(note)}`}>
                <MoreHorizontal />
              </Button>
            }
          />
        </div>
      </div>
    </RowContextMenu>
  )
}

/** The note that collects what's shared from other apps (lib/collect.ts) shows an inbox instead of a page */
function NoteIcon({ collecting, template }: { collecting: boolean; template: boolean }) {
  if (template && !collecting) {
    return <LayoutTemplate className="size-4 shrink-0 text-muted-foreground" role="img" aria-label="Template" />
  }
  if (!collecting) return <FileText className="size-4 shrink-0 text-muted-foreground" />
  return <Inbox className="size-4 shrink-0 text-muted-foreground" role="img" aria-label="Collects what you share to Lodoc" />
}

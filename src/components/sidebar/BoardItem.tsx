import { LayoutDashboard, MoreHorizontal } from 'lucide-react'
import { RowContextMenu, RowDropdownMenu } from '@/components/ItemMenu'
import { Button } from '@/components/ui/button'
import { boardTitle, renameBoard } from '@/db/boards'
import type { Board } from '@/db/schema'
import { useBoardMenuEntries } from '@/hooks/useItemMenus'
import { RenameInput } from './RenameInput'
import { rowActionsClass, rowClass, rowLinkClass } from './row-styles'
import { useSidebar, withSelectEntry } from './sidebar-context'
import { dndId, useTreeItem } from './tree-dnd'

/**
 * A board in the sidebar: in the Boards section (top level) or inside its folder. Boards are sorted (newest
 * first), so dragging one only moves it into another folder or back to the top level, never between rows.
 */
export function BoardItem({ board, depth = 0 }: { board: Board; depth?: number }) {
  const { activeBoardId, renamingId, setRenamingId, toggleExpanded, selected, toggleSelected, selectClick } = useSidebar()
  const selectKey = dndId('board', board.id)
  const isSelected = selected.has(selectKey)
  const active = board.id === activeBoardId
  const renameKey = `board:${board.id}`
  const renaming = renamingId === renameKey
  const menu = useBoardMenuEntries(board, {
    onRename: () => setRenamingId(renameKey),
    onMoved: (folderId) => folderId && toggleExpanded(folderId, true),
  })
  const entries = withSelectEntry(menu, isSelected, () => toggleSelected(selectKey))
  // Same indent as notes, so a board's icon lines up with the notes next to it
  const indent = { paddingLeft: depth === 0 ? '0.5rem' : `${2 + depth * 0.75}rem` }
  const { setNodeRef, listeners, isDragging } = useTreeItem(
    dndId('board', board.id),
    { type: 'board', board },
    { dragDisabled: renaming },
  )

  return (
    <RowContextMenu entries={entries}>
      <div
        ref={setNodeRef}
        {...listeners}
        data-active={active}
        data-select-key={selectKey}
        data-selected={isSelected || undefined}
        className={rowClass(active, false, isDragging, isSelected)}
      >
        {renaming ? (
          <div className="flex h-full min-w-0 flex-1 items-center gap-2" style={indent}>
            <LayoutDashboard className="size-4 shrink-0 text-muted-foreground" />
            <RenameInput
              initial={board.title}
              onDone={(title) => {
                if (title !== null) void renameBoard(board.id, title)
                setRenamingId(null)
              }}
            />
          </div>
        ) : (
          <a
            href={`#/board/${encodeURIComponent(board.id)}`}
            aria-current={active ? 'page' : undefined}
            className={rowLinkClass}
            style={indent}
            draggable={false}
            onClick={(e) => selectClick(e, selectKey)}
          >
            <LayoutDashboard className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">
              {boardTitle(board)}
              {isSelected && <span className="sr-only">, selected</span>}
            </span>
          </a>
        )}
        <div className={rowActionsClass}>
          <RowDropdownMenu
            entries={entries}
            trigger={
              <Button variant="ghost" size="icon-xs" aria-label={`Actions for ${boardTitle(board)}`}>
                <MoreHorizontal />
              </Button>
            }
          />
        </div>
      </div>
    </RowContextMenu>
  )
}

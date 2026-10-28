import { NodeResizer, type NodeProps } from '@xyflow/react'
import { MoreHorizontal, Pencil, Spline, X } from 'lucide-react'
import { RowDropdownMenu, type MenuEntry } from '@/components/ItemMenu'
import { Button } from '@/components/ui/button'
import type { BoardNode } from '@/db/schema'
import { cn } from '@/lib/utils'
import { useBoard } from '../board-context'
import { ConnectHandles } from '../ConnectHandles'
import { frameTitle, type BoardFlowNode } from '../flow'

type FrameItem = Extract<BoardNode, { type: 'frame' }>

/**
 * An area with a title that groups what lies on it ("Ideas", "To do"). It sits behind the other items, and
 * dragging it takes everything that lies completely inside along (see BoardPage). Removing it keeps the items.
 */
export function FrameNode({ id, data, selected }: NodeProps<BoardFlowNode>) {
  const { title } = data as FrameItem
  const board = useBoard()
  const editing = board.editingId === id
  const name = frameTitle(title)

  const entries: MenuEntry[] = [
    { type: 'item', label: 'Rename', icon: Pencil, onSelect: () => board.setEditingId(id) },
    { type: 'item', label: 'Connect to…', icon: Spline, onSelect: () => board.connectFrom(id) },
    { type: 'separator' },
    { type: 'item', label: 'Remove frame', icon: X, onSelect: () => board.removeNodes([id]) },
  ]

  return (
    <>
      <NodeResizer
        isVisible={selected && !editing}
        minWidth={160}
        minHeight={100}
        onResizeStart={board.beginInteraction}
        onResizeEnd={(_, box) => board.resizeEnd(id, box)}
      />
      <ConnectHandles />
      <div
        data-testid="board-frame"
        className={cn(
          'flex h-full w-full flex-col rounded-xl border-2 border-border bg-muted/40 text-foreground',
          selected && 'border-ring',
        )}
      >
        <div className="flex h-10 shrink-0 items-center gap-1 pr-1 pl-3" onDoubleClick={() => board.setEditingId(id)}>
          {editing ? (
            <input
              autoFocus
              defaultValue={title}
              aria-label="Frame name"
              placeholder="Untitled frame"
              className="nodrag h-7 min-w-0 flex-1 rounded-md bg-background px-2 font-page text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring/60 pointer-coarse:text-base"
              onFocus={(e) => e.currentTarget.select()}
              onBlur={(e) => board.renameFrame(id, e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
                else if (e.key === 'Escape') {
                  e.currentTarget.value = title
                  e.currentTarget.blur()
                }
              }}
            />
          ) : (
            <span
              data-testid="board-frame-title"
              className={cn('min-w-0 flex-1 truncate font-page text-sm font-semibold', !title.trim() && 'text-muted-foreground')}
            >
              {name}
            </span>
          )}
          <RowDropdownMenu
            align="end"
            entries={entries}
            trigger={
              <Button variant="ghost" size="icon-xs" className="nodrag" aria-label={`Actions for frame ${name}`}>
                <MoreHorizontal />
              </Button>
            }
          />
        </div>
      </div>
    </>
  )
}

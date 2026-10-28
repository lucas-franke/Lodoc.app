import { BaseEdge, EdgeLabelRenderer, useInternalNode, type EdgeProps, type InternalNode } from '@xyflow/react'
import { ArrowLeftRight, Tag, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useBoard } from './board-context'
import type { BoardFlowEdge } from './flow'

/** Space between an arrow's ends and the items it connects */
const GAP = 6
const HEAD = 9

function box(node: InternalNode) {
  const { x, y } = node.internals.positionAbsolute
  return { x, y, w: node.measured.width ?? node.width ?? 0, h: node.measured.height ?? node.height ?? 0 }
}

/** Where the line from the middle of `b` toward `toward` leaves the box, plus the gap */
function borderPoint(b: ReturnType<typeof box>, toward: { x: number; y: number }) {
  const cx = b.x + b.w / 2
  const cy = b.y + b.h / 2
  const dx = toward.x - cx
  const dy = toward.y - cy
  if (!dx && !dy) return { x: cx, y: cy }
  const scale = Math.min(b.w / 2 / Math.abs(dx), b.h / 2 / Math.abs(dy)) + GAP / Math.hypot(dx, dy)
  return { x: cx + dx * scale, y: cy + dy * scale }
}

/**
 * A straight arrow between the edges of two items, attached wherever the line between their middles leaves
 * them (so it never takes a detour when items move). Double-click it to label it; when selected, a small
 * toolbar offers label, reverse and delete.
 */
export function ArrowEdge({ id, source, target, data, selected }: EdgeProps<BoardFlowEdge>) {
  const board = useBoard()
  const from = useInternalNode(source)
  const to = useInternalNode(target)
  if (!from || !to) return null

  const a = box(from)
  const b = box(to)
  const start = borderPoint(a, { x: b.x + b.w / 2, y: b.y + b.h / 2 })
  const end = borderPoint(b, { x: a.x + a.w / 2, y: a.y + a.h / 2 })
  const angle = Math.atan2(end.y - start.y, end.x - start.x)
  // The line stops at the base of the arrowhead, so its end doesn't poke through the tip
  const base = { x: end.x - Math.cos(angle) * HEAD, y: end.y - Math.sin(angle) * HEAD }
  const side = (sign: number) =>
    `${base.x + Math.cos(angle + (sign * Math.PI) / 2) * (HEAD / 2)},${base.y + Math.sin(angle + (sign * Math.PI) / 2) * (HEAD / 2)}`
  const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }

  const label = data?.label ?? ''
  const editing = board.editingId === id
  const color = selected ? 'var(--ring)' : 'var(--muted-foreground)'

  return (
    <>
      <BaseEdge
        id={id}
        path={`M ${start.x},${start.y} L ${base.x},${base.y}`}
        interactionWidth={18}
        style={{ stroke: color, strokeWidth: selected ? 2 : 1.5 }}
      />
      <path d={`M ${end.x},${end.y} L ${side(1)} L ${side(-1)} Z`} style={{ fill: color }} className="pointer-events-none" />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan pointer-events-auto absolute flex flex-col items-center gap-1"
          style={{ transform: `translate(-50%, -50%) translate(${mid.x}px, ${mid.y}px)` }}
        >
          {editing ? (
            <input
              autoFocus
              defaultValue={label}
              aria-label="Arrow label"
              placeholder="Label"
              className="h-7 w-36 rounded-md border bg-background px-2 text-center font-page text-xs shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60 pointer-coarse:text-base"
              onBlur={(e) => board.setEdgeLabel(id, e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
                else if (e.key === 'Escape') {
                  e.currentTarget.value = label
                  e.currentTarget.blur()
                }
              }}
            />
          ) : (
            label && (
              <span
                data-testid="board-arrow-label"
                onDoubleClick={() => board.setEditingId(id)}
                className={cn(
                  'max-w-48 truncate rounded-md border bg-background px-2 py-0.5 font-page text-xs text-foreground shadow-sm',
                  selected && 'border-ring',
                )}
              >
                {label}
              </span>
            )
          )}
          {selected && !editing && (
            <div role="toolbar" aria-label="Arrow" className="flex gap-0.5 rounded-lg border bg-popover p-1 shadow-md">
              <Button variant="ghost" size="icon-xs" className="pointer-coarse:size-9" aria-label={label ? 'Edit label' : 'Add label'} onClick={() => board.setEditingId(id)}>
                <Tag />
              </Button>
              <Button variant="ghost" size="icon-xs" className="pointer-coarse:size-9" aria-label="Reverse direction" onClick={() => board.reverseEdge(id)}>
                <ArrowLeftRight />
              </Button>
              <Button variant="ghost" size="icon-xs" className="pointer-coarse:size-9" aria-label="Delete arrow" onClick={() => board.removeEdges([id])}>
                <Trash2 />
              </Button>
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

import { NodeResizer, NodeToolbar, Position, type NodeProps } from '@xyflow/react'
import { Spline } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import type { BoardNode } from '@/db/schema'
import { cn } from '@/lib/utils'
import { useBoard } from '../board-context'
import { ConnectHandles } from '../ConnectHandles'
import type { BoardFlowNode } from '../flow'

type TextItem = Extract<BoardNode, { type: 'text' }>

// Relative to the page text size from the Appearance panel (1rem by default: 16 / 24 / 36 px)
const SIZES = [
  { size: 's', label: 'Small text', glyph: 'S', className: 'text-[length:var(--page-text-size)]' },
  { size: 'm', label: 'Medium text', glyph: 'M', className: 'text-[length:calc(var(--page-text-size)*1.5)] leading-tight font-semibold tracking-tight' },
  { size: 'l', label: 'Large text', glyph: 'L', className: 'text-[length:calc(var(--page-text-size)*2.25)] leading-tight font-bold tracking-tight' },
] as const

/** A loose annotation that exists only on the canvas: plain text in three sizes. */
export function TextNode({ id, data, selected }: NodeProps<BoardFlowNode>) {
  const { text, size } = data as TextItem
  const board = useBoard()
  const editing = board.editingId === id
  const textarea = useRef<HTMLTextAreaElement>(null)
  const sizeClass = SIZES.find((s) => s.size === size)?.className

  useEffect(() => {
    if (!editing) return
    let frame = 0
    let tries = 0
    const focusField = () => {
      const el = textarea.current
      if (!el) return
      el.focus()
      // A node that was just added stays visibility:hidden until React Flow has measured it, and
      // focus() does nothing on a hidden element: try again on the next frames.
      if (document.activeElement !== el && tries++ < 30) frame = requestAnimationFrame(focusField)
      else el.setSelectionRange(el.value.length, el.value.length)
    }
    focusField()
    return () => cancelAnimationFrame(frame)
  }, [editing])

  return (
    <>
      <NodeResizer
        isVisible={selected && !editing}
        minWidth={80}
        minHeight={40}
        onResizeStart={board.beginInteraction}
        onResizeEnd={(_, box) => board.resizeEnd(id, box)}
      />
      <NodeToolbar isVisible={selected && !editing} position={Position.Top}>
        <div role="toolbar" aria-label="Text" className="nodrag flex gap-0.5 rounded-lg border bg-popover p-1 shadow-md">
          {SIZES.map((s) => (
            <Button
              key={s.size}
              variant={s.size === size ? 'secondary' : 'ghost'}
              size="icon-xs"
              aria-label={s.label}
              aria-pressed={s.size === size}
              onClick={() => board.setTextSize(id, s.size)}
            >
              {s.glyph}
            </Button>
          ))}
          <div className="mx-0.5 w-px self-stretch bg-border" />
          <Button variant="ghost" size="icon-xs" aria-label="Connect to…" onClick={() => board.connectFrom(id)}>
            <Spline />
          </Button>
        </div>
      </NodeToolbar>
      {!editing && <ConnectHandles />}
      <div
        data-testid="board-text"
        className={cn(
          'h-full w-full overflow-hidden rounded-md border border-transparent p-2 text-foreground hover:border-border',
          selected && 'border-dashed border-ring/70',
        )}
        onDoubleClick={() => board.setEditingId(id)}
      >
        {editing ? (
          // nodrag / nowheel / nopan: typing, selecting text and scrolling must not move the canvas
          <textarea
            ref={textarea}
            aria-label="Text"
            placeholder="Type something…"
            defaultValue={text}
            className={cn('nodrag nowheel nopan h-full w-full resize-none bg-transparent font-page outline-none', sizeClass)}
            onChange={(e) => board.growText(id, e.currentTarget)}
            onBlur={(e) => board.commitText(id, e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Escape' && e.currentTarget.blur()}
          />
        ) : (
          <p className={cn('font-page break-words whitespace-pre-wrap', sizeClass)}>{text}</p>
        )}
      </div>
    </>
  )
}

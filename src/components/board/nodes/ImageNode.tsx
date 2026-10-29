import { NodeResizer, NodeToolbar, Position, type NodeProps } from '@xyflow/react'
import { Captions, Image as ImageIcon, ImageOff, PanelBottom, Spline } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Button } from '@/components/ui/button'
import type { BoardNode } from '@/db/schema'
import { useAssetUrl } from '@/hooks/useAssetUrl'
import { cn } from '@/lib/utils'
import { useBoard } from '../board-context'
import { ConnectHandles } from '../ConnectHandles'
import type { BoardFlowNode } from '../flow'

type ImageItem = Extract<BoardNode, { type: 'image' }>

/** A slight tilt for a Polaroid, always the same for the same image: 0.6° to 2.1° either way */
function tilt(id: string) {
  const t = (([...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 1000) / 1000) * 3 - 1.5
  return `${(t < 0 ? t - 0.6 : t + 0.6).toFixed(2)}deg`
}

/**
 * An image from the assets table, resizable with its aspect ratio locked. Plain, or as a Polaroid: a white frame with
 * its caption (the image's description) in the deeper bottom, slightly tilted until it is selected.
 */
export function ImageNode({ id, data, selected }: NodeProps<BoardFlowNode>) {
  const { assetId, alt, style } = data as ImageItem
  const board = useBoard()
  const url = useAssetUrl(assetId)
  const polaroid = style === 'polaroid'
  const editing = board.editingId === id

  const picture = url ? (
    <img src={url} alt={alt ?? ''} draggable={false} className={cn('h-full w-full select-none', polaroid ? 'object-cover' : 'object-fill')} />
  ) : (
    url === null && (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-muted text-xs text-muted-foreground">
        <ImageOff className="size-5" />
        Image missing
      </div>
    )
  )

  return (
    <>
      <NodeResizer
        isVisible={selected}
        keepAspectRatio
        minWidth={60}
        minHeight={60}
        onResizeStart={board.beginInteraction}
        onResizeEnd={(_, box) => board.resizeEnd(id, box)}
      />
      <NodeToolbar isVisible={selected && !editing} position={Position.Top}>
        <div role="toolbar" aria-label="Image" className="nodrag flex gap-0.5 rounded-lg border bg-popover p-1 shadow-md">
          <Button
            variant={polaroid ? 'ghost' : 'secondary'}
            size="icon-xs"
            className="pointer-coarse:size-9"
            aria-label="Plain"
            aria-pressed={!polaroid}
            onClick={() => board.setImageStyle(id, 'plain')}
          >
            <ImageIcon />
          </Button>
          <Button
            variant={polaroid ? 'secondary' : 'ghost'}
            size="icon-xs"
            className="pointer-coarse:size-9"
            aria-label="Polaroid"
            aria-pressed={polaroid}
            onClick={() => board.setImageStyle(id, 'polaroid')}
          >
            <PanelBottom />
          </Button>
          {polaroid && (
            <Button variant="ghost" size="icon-xs" className="pointer-coarse:size-9" aria-label="Caption" onClick={() => board.setEditingId(id)}>
              <Captions />
            </Button>
          )}
          <div className="mx-0.5 w-px self-stretch bg-border" />
          <Button variant="ghost" size="icon-xs" className="pointer-coarse:size-9" aria-label="Connect to…" onClick={() => board.connectFrom(id)}>
            <Spline />
          </Button>
        </div>
      </NodeToolbar>
      <ConnectHandles />
      {polaroid ? (
        <div
          data-testid="board-image"
          className={cn('polaroid flex h-full w-full flex-col', selected ? 'outline-2 outline-offset-2 outline-ring/60' : 'polaroid-tilt')}
          style={{ '--tilt': tilt(id) } as CSSProperties}
        >
          <div className="min-h-0 flex-1 overflow-hidden">{picture}</div>
          {editing ? (
            // nodrag / nopan: typing and selecting text must not move the image or the canvas
            <input
              autoFocus
              defaultValue={alt ?? ''}
              aria-label="Caption"
              placeholder="Caption"
              className="polaroid-caption nodrag nopan w-full bg-transparent outline-none placeholder:text-[color-mix(in_oklch,currentColor_45%,transparent)]"
              onFocus={(e) => e.currentTarget.select()}
              onBlur={(e) => board.setImageCaption(id, e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
                else if (e.key === 'Escape') {
                  e.currentTarget.value = alt ?? ''
                  e.currentTarget.blur()
                }
              }}
            />
          ) : (
            <p className="polaroid-caption" onDoubleClick={() => board.setEditingId(id)}>
              {alt || (selected && <span className="opacity-45">Add a caption</span>)}
            </p>
          )}
        </div>
      ) : (
        <div data-testid="board-image" className={cn('h-full w-full overflow-hidden rounded-md', selected && 'ring-2 ring-ring/60')}>
          {picture}
        </div>
      )}
    </>
  )
}

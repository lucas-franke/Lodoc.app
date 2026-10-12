import { NodeResizer, NodeToolbar, Position, type NodeProps } from '@xyflow/react'
import { ImageOff, Spline } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { BoardNode } from '@/db/schema'
import { useAssetUrl } from '@/hooks/useAssetUrl'
import { cn } from '@/lib/utils'
import { useBoard } from '../board-context'
import { ConnectHandles } from '../ConnectHandles'
import type { BoardFlowNode } from '../flow'

type ImageItem = Extract<BoardNode, { type: 'image' }>

/** An image from the assets table, resizable with its aspect ratio locked. */
export function ImageNode({ id, data, selected }: NodeProps<BoardFlowNode>) {
  const { assetId, alt } = data as ImageItem
  const board = useBoard()
  const url = useAssetUrl(assetId)

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
      <NodeToolbar isVisible={selected} position={Position.Top}>
        <div role="toolbar" aria-label="Image" className="nodrag flex rounded-lg border bg-popover p-1 shadow-md">
          <Button variant="ghost" size="icon-xs" aria-label="Connect to…" onClick={() => board.connectFrom(id)}>
            <Spline />
          </Button>
        </div>
      </NodeToolbar>
      <ConnectHandles />
      <div
        data-testid="board-image"
        className={cn('h-full w-full overflow-hidden rounded-md', selected && 'ring-2 ring-ring/60')}
      >
        {url ? (
          <img src={url} alt={alt ?? ''} draggable={false} className="h-full w-full object-fill select-none" />
        ) : (
          url === null && (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-muted text-xs text-muted-foreground">
              <ImageOff className="size-5" />
              Image missing
            </div>
          )
        )}
      </div>
    </>
  )
}

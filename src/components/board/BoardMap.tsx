import type { Board, BoardNode } from '@/db/schema'
import { useAssetUrl } from '@/hooks/useAssetUrl'
import { cn } from '@/lib/utils'

/** At most this many images are drawn as pictures; the rest as plain blocks */
const MAX_PICTURES = 8

/**
 * A small drawing of a board for its card: frames as outlines, notes as cards, text as lines, images as
 * themselves, arrows as thin lines. Decorative; the card's title and footer say what it is.
 */
export function BoardMap({ board, className }: { board: Board; className?: string }) {
  const nodes = board.nodes
  if (!nodes.length) return <div aria-hidden className={cn('board-map-empty bg-muted/60', className)} />
  const minX = Math.min(...nodes.map((n) => n.x))
  const minY = Math.min(...nodes.map((n) => n.y))
  const maxX = Math.max(...nodes.map((n) => n.x + n.width))
  const maxY = Math.max(...nodes.map((n) => n.y + n.height))
  const pad = Math.max(maxX - minX, maxY - minY) * 0.06
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const center = (n: BoardNode) => [n.x + n.width / 2, n.y + n.height / 2]
  let pictures = 0
  return (
    <div aria-hidden className={cn('overflow-hidden bg-muted/60', className)}>
      <svg viewBox={`${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`} className="size-full">
        {nodes
          .filter((n) => n.type === 'frame')
          .map((n) => (
            <rect key={n.id} x={n.x} y={n.y} width={n.width} height={n.height} rx={14} className="fill-background/70 stroke-muted-foreground/40" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
          ))}
        {(board.edges ?? []).map((e) => {
          const from = byId.get(e.source)
          const to = byId.get(e.target)
          if (!from || !to) return null
          const [x1, y1] = center(from)
          const [x2, y2] = center(to)
          return <line key={e.id} x1={x1} y1={y1} x2={x2} y2={y2} className="stroke-muted-foreground/50" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        })}
        {nodes.map((n) => {
          if (n.type === 'note')
            return <rect key={n.id} x={n.x} y={n.y} width={n.width} height={n.height} rx={10} className="fill-card stroke-border" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          if (n.type === 'text') {
            const line = { s: 16, m: 24, l: 36 }[n.size]
            return <rect key={n.id} x={n.x} y={n.y + (n.height - line) / 2} width={n.width * 0.8} height={line * 0.6} rx={line * 0.3} className="fill-muted-foreground/50" />
          }
          if (n.type === 'image') {
            pictures++
            return pictures <= MAX_PICTURES ? <MapImage key={n.id} node={n} /> : <rect key={n.id} x={n.x} y={n.y} width={n.width} height={n.height} rx={6} className="fill-muted-foreground/30" />
          }
          return null
        })}
      </svg>
    </div>
  )
}

function MapImage({ node }: { node: Extract<BoardNode, { type: 'image' }> }) {
  const url = useAssetUrl(node.assetId)
  return url ? (
    <image href={url} x={node.x} y={node.y} width={node.width} height={node.height} preserveAspectRatio="xMidYMid slice" />
  ) : (
    <rect x={node.x} y={node.y} width={node.width} height={node.height} rx={6} className="fill-muted-foreground/30" />
  )
}

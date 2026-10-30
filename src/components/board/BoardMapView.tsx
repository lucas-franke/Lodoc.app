import { useId } from 'react'
import { noteTitle } from '@/lib/note-text'
import type { Board, BoardNode, Note } from '@/db/schema'
import { useAppearance } from '@/hooks/useAppearance'
import { useAssetUrl } from '@/hooks/useAssetUrl'
import { resolveCover } from '@/lib/cover'
import { gradientById } from '@/lib/gradients'
import { cn } from '@/lib/utils'

/** At most this many images are drawn as pictures; the rest as plain blocks */
const MAX_PICTURES = 8

/**
 * A small drawing of a board for its card, the way the board looks: frames with their names, note cards with their
 * cover, title and a few lines for the text, text items as lines, images as themselves, arrows as thin lines.
 * Decorative; the card's title and footer say what it is. Display only: BoardMap looks up the notes on it.
 */
export function BoardMapView({ board, notes, className }: { board: Board; notes: Map<string, Note>; className?: string }) {
  const uid = useId()
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
    <div aria-hidden className={cn('overflow-hidden bg-muted', className)}>
      <svg viewBox={`${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`} className="size-full">
        {nodes
          .filter((n) => n.type === 'frame')
          .map((n) => (
            <g key={n.id}>
              <rect x={n.x} y={n.y} width={n.width} height={n.height} rx={14} className="fill-background/70 stroke-muted-foreground/50" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
              {n.title && (
                <text x={n.x + 14} y={n.y + 26} className="fill-foreground font-sans" fontSize={16} fontWeight={600}>
                  {n.title}
                </text>
              )}
            </g>
          ))}
        {(board.edges ?? []).map((e) => {
          const from = byId.get(e.source)
          const to = byId.get(e.target)
          if (!from || !to) return null
          const [x1, y1] = center(from)
          const [x2, y2] = center(to)
          return <line key={e.id} x1={x1} y1={y1} x2={x2} y2={y2} className="stroke-muted-foreground/60" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        })}
        {nodes.map((n) => {
          if (n.type === 'note') return <MapCard key={n.id} node={n} note={notes.get(n.noteId)} clipId={`${uid}-${n.id}`} />
          if (n.type === 'text') {
            const line = { s: 16, m: 24, l: 36 }[n.size]
            return <rect key={n.id} x={n.x} y={n.y + (n.height - line) / 2} width={n.width * 0.8} height={line * 0.6} rx={line * 0.3} className="fill-muted-foreground/60" />
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

/** A note card: its cover (a chosen one as the top part, an automatic one as a band), its title, lines for its text */
function MapCard({ node, note, clipId }: { node: Extract<BoardNode, { type: 'note' }>; note: Note | undefined; clipId: string }) {
  const { autoCover } = useAppearance()
  const cover = note ? resolveCover(note, autoCover) : null
  const coverUrl = useAssetUrl(cover?.kind === 'image' ? cover.assetId : '')
  const { x, y, width: w, height: h } = node
  const titleOnly = node.view === 'title'
  const coverHeight = !cover || titleOnly ? 0 : cover.kind === 'gradient' && cover.auto ? Math.max(6, h * 0.04) : Math.min(h * 0.45, w * 0.44)
  const gradient = cover?.kind === 'gradient' ? gradientById(cover.id) : null
  const titleY = y + coverHeight + 24
  const lines = titleOnly ? 0 : Math.max(0, Math.min(3, Math.floor((y + h - titleY - 14) / 18)))
  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <rect x={x} y={y} width={w} height={h} rx={10} />
        </clipPath>
        {gradient && (
          <linearGradient id={`${clipId}-g`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" className="cover-stop-from" style={{ '--cover-from': gradient.light[0], '--cover-from-dark': gradient.dark[0] } as React.CSSProperties} />
            <stop offset="1" className="cover-stop-to" style={{ '--cover-to': gradient.light[1], '--cover-to-dark': gradient.dark[1] } as React.CSSProperties} />
          </linearGradient>
        )}
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect x={x} y={y} width={w} height={h} className="fill-card" />
        {coverHeight > 0 &&
          (cover?.kind === 'image' ? (
            coverUrl && <image href={coverUrl} x={x} y={y} width={w} height={coverHeight} preserveAspectRatio="xMidYMid slice" />
          ) : (
            <rect x={x} y={y} width={w} height={coverHeight} fill={`url(#${clipId}-g)`} />
          ))}
        <text x={x + 14} y={titleY} className="fill-foreground font-sans" fontSize={17} fontWeight={600}>
          {note ? noteTitle(note) : ''}
        </text>
        {Array.from({ length: lines }, (_, i) => (
          <rect key={i} x={x + 14} y={titleY + 14 + i * 18} width={(w - 28) * (i === lines - 1 ? 0.6 : 0.9)} height={7} rx={3.5} className="fill-muted-foreground/30" />
        ))}
      </g>
      <rect x={x} y={y} width={w} height={h} rx={10} className="fill-none stroke-muted-foreground/45" strokeWidth={1} vectorEffect="non-scaling-stroke" />
    </g>
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

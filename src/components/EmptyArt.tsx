import { cn } from '@/lib/utils'

/**
 * Small line drawings for empty places (a spark of joy): the empty trash, an empty folder, an empty board.
 * Quiet grey lines with one touch in --joy (the tint's hue). Decorative only.
 */
export function EmptyArt({ kind, className }: { kind: 'trash' | 'folder' | 'board'; className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 128 88"
      fill="none"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-22 w-32 stroke-muted-foreground/60', className)}
    >
      {kind === 'trash' && (
        <>
          {/* A bin with its lid lifted, and a little sparkle: all clear */}
          <path d="M44 36 L48.5 76 Q49 80 53 80 L75 80 Q79 80 79.5 76 L84 36" />
          <path d="M40 36 Q64 34.5 88 36" />
          <path d="M57.5 44 L58.5 72 M64 44 V72 M70.5 44 L69.5 72" />
          <path d="M45 24 Q64 17 85 21" />
          <path d="M58 19.5 Q64 14.5 70 17.5" />
          <g className="stroke-(--joy)">
            <path d="M99 12 V22 M94 17 H104" />
            <path d="M28 24 V31 M24.5 27.5 H31.5" />
            <circle cx="106" cy="34" r="1.2" />
          </g>
        </>
      )}
      {kind === 'folder' && (
        <>
          {/* An open folder with a page on its way in */}
          <path d="M30 31 Q30 27 34 27 L51 27 L57 33 L93 33 Q97 33 97 37 L97 44" />
          <g className="stroke-(--joy)">
            <path d="M53 19 L79 14.5 L84 44 L58 48.5 Z" className="fill-background" />
            <path d="M59.5 25 L75.5 22.2 M60.8 31 L76.8 28.2 M62 37 L71 35.4" />
          </g>
          <path
            d="M28 43 Q28 40.5 31 40.5 L97 40.5 Q100.5 40.5 100 44 L96.6 71 Q96 74.5 92.5 74.5 L35.5 74.5 Q32 74.5 31.5 71 Z"
            className="fill-background"
          />
        </>
      )}
      {kind === 'board' && (
        <>
          {/* A few cards waiting to be placed, and an arrow between two of them */}
          <rect x="14" y="22" width="36" height="26" rx="4" strokeDasharray="4 3.5" />
          <rect x="78" y="12" width="36" height="26" rx="4" strokeDasharray="4 3.5" />
          <rect x="50" y="58" width="36" height="22" rx="4" strokeDasharray="4 3.5" />
          <g className="stroke-(--joy)">
            <path d="M52 34 Q64 26 75 25.5" />
            <path d="M70.5 21.8 L75.5 25.5 L70.8 29.6" />
          </g>
          <path d="M94 41 Q92 52 84 56" strokeDasharray="2 3.5" />
        </>
      )}
    </svg>
  )
}

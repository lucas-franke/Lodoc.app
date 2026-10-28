import type { Appearance } from '@/lib/appearance'
import { cn } from '@/lib/utils'

/**
 * A miniature of Lodoc, drawn with the same CSS variables and data attributes as the app itself, so it shows
 * every setting while Settings covers the page: the sidebar (floating, grain, tint) and a note.
 * On a phone it is just the note (`compact`), as the sidebar there lies over the page anyway.
 */
export function AppearancePreview({
  sidebar,
  autoCover,
  flash,
  compact = false,
}: {
  sidebar: Appearance['sidebar']
  autoCover: boolean
  /** Counts changes; each one lights the preview up briefly */
  flash: number
  compact?: boolean
}) {
  return (
    <div
      aria-hidden
      data-preview-shell
      // Like the app: with a floating sidebar the page texture also fills the gap around it (index.css, "frame")
      data-texture-surface={!compact && sidebar === 'floating' ? 'frame' : undefined}
      className={cn('relative flex overflow-hidden rounded-lg border bg-background text-foreground', compact ? 'h-32' : 'h-44')}
    >
      {/* A fresh element per change restarts the animation */}
      {flash > 0 && <span key={flash} data-preview-flash className="pointer-events-none absolute inset-0 z-40 rounded-[inherit]" />}
      {!compact && (
        <div
          data-preview-ui
          className="relative flex w-24 shrink-0 flex-col gap-1.5 border-r bg-sidebar p-2.5 floating:m-1.5 floating:mr-0 floating:rounded-md floating:border floating:shadow-sm"
        >
          <span className="mb-1 h-1.5 w-10 rounded-full bg-foreground/70" />
          {[52, 60, 40, 56, 46].map((w, i) => (
            <span
              key={i}
              className={cn('h-1.5 rounded-full', i === 1 ? 'bg-foreground/40' : 'bg-muted-foreground/30')}
              style={{ width: w }}
            />
          ))}
        </div>
      )}

      <div
        data-texture-surface={!compact && sidebar === 'floating' ? undefined : ''}
        className="relative min-w-0 flex-1 overflow-hidden px-3 pt-3"
      >
        <div className={cn('mx-auto', compact ? 'w-[78%]' : 'w-[62%]')} data-preview-page>
          {autoCover && <div className={cn('rounded-md bg-linear-to-br from-sky-400 to-teal-300', compact ? 'h-7' : 'h-10')} />}
          <p className="mt-2 truncate font-page leading-tight font-bold" style={{ fontSize: 'calc(var(--page-text-size) * 0.95)' }}>
            Morning pages
          </p>
          <p
            className="mt-1 line-clamp-3 font-page leading-snug text-muted-foreground"
            style={{ fontSize: 'calc(var(--page-text-size) * 0.6)' }}
          >
            Write a little every day. Small notes turn into ideas, and ideas into plans worth keeping.
          </p>
        </div>
      </div>
    </div>
  )
}


import type { ReactNode } from 'react'
import type { Appearance } from '@/lib/appearance'
import { cn } from '@/lib/utils'

export type PreviewView = 'page' | 'board'
/** The part of the preview that briefly lights up after a change */
export type PreviewArea = 'shell' | 'sidebar' | 'page'
export type PreviewFlash = { area: PreviewArea; n: number } | null

/**
 * A miniature of Lodoc, drawn with the same CSS variables and data attributes as the app itself, so it shows
 * every setting no matter which view is open behind the panel (e.g. the page font while looking at a board).
 */
export function AppearancePreview({
  view,
  sidebar,
  autoCover,
  flash,
}: {
  view: PreviewView
  sidebar: Appearance['sidebar']
  autoCover: boolean
  flash: PreviewFlash
}) {
  // A fresh element per change restarts the animation
  const pulse = (area: PreviewArea) =>
    flash?.area === area && (
      <span key={flash.n} aria-hidden data-preview-flash className="pointer-events-none absolute inset-0 z-40 rounded-[inherit]" />
    )

  return (
    <div
      aria-hidden
      data-preview-shell
      // Like the app: with a floating sidebar the page texture also fills the gap around it (index.css, "frame")
      data-texture-surface={view === 'page' && sidebar === 'floating' ? 'frame' : undefined}
      className="relative flex h-32 overflow-hidden rounded-lg border bg-background text-foreground"
    >
      {pulse('shell')}
      <div
        data-preview-ui
        className="relative flex w-[4.5rem] shrink-0 flex-col gap-1.5 border-r bg-sidebar p-2 floating:m-1.5 floating:mr-0 floating:rounded-md floating:border floating:shadow-sm"
      >
        {pulse('sidebar')}
        <span className="mb-1 h-1.5 w-8 rounded-full bg-foreground/70" />
        {[40, 48, 32, 44].map((w, i) => (
          <span
            key={i}
            className={cn('h-1.5 rounded-full', i === 1 ? 'bg-foreground/40' : 'bg-muted-foreground/30')}
            style={{ width: w }}
          />
        ))}
      </div>

      {view === 'page' ? (
        <div
          data-texture-surface={sidebar === 'floating' ? undefined : ''}
          className="relative min-w-0 flex-1 overflow-hidden px-3 pt-3"
        >
          {pulse('page')}
          <div
            className="mx-auto w-[68%]"
            data-preview-page
          >
            {autoCover && <div className="h-7 rounded-md bg-linear-to-br from-sky-400 to-teal-300" />}
            <p
              className="mt-2 truncate font-page leading-tight font-bold"
              style={{ fontSize: 'calc(var(--page-text-size) * 0.85)' }}
            >
              Morning pages
            </p>
            <p
              className="mt-1 line-clamp-3 font-page leading-snug text-muted-foreground"
              style={{ fontSize: 'calc(var(--page-text-size) * 0.55)' }}
            >
              Write a little every day. Small notes turn into ideas, and ideas into plans worth keeping.
            </p>
          </div>
        </div>
      ) : (
        <div
          className="relative min-w-0 flex-1 overflow-hidden"
          style={{ backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)', backgroundSize: '10px 10px' }}
        >
          {pulse('page')}
          <p
            className="absolute top-2.5 left-3 font-page font-semibold"
            style={{ fontSize: 'calc(var(--page-text-size) * 0.75)' }}
          >
            Ideas
          </p>
          <MiniCard className="top-9 left-3" title="Trip plan" cover="from-rose-300 to-amber-200" />
          <MiniCard className="top-5 left-[54%]" title="Reading list" cover="from-violet-300 to-sky-300" />
        </div>
      )}
    </div>
  )
}

function MiniCard({ className, title, cover }: { className: string; title: ReactNode; cover: string }) {
  return (
    <div className={cn('absolute w-[40%] overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm', className)}>
      <p className="truncate px-1.5 py-1 font-page text-[10px] font-medium">{title}</p>
      <div className={cn('h-6 bg-linear-to-br', cover)} />
      <div className="space-y-1 p-1.5">
        <span className="block h-1 w-4/5 rounded-full bg-muted-foreground/30" />
        <span className="block h-1 w-3/5 rounded-full bg-muted-foreground/30" />
      </div>
    </div>
  )
}

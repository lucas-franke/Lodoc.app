/**
 * A miniature note, drawn with the same CSS variables and data attributes as the app itself. Shown on phones,
 * where the Appearance panel covers the page; on wider screens the page beside the panel is the preview.
 */
export function AppearancePreview({ autoCover, flash }: { autoCover: boolean; flash: number }) {
  return (
    <div
      aria-hidden
      data-preview-shell
      data-texture-surface=""
      className="relative h-32 overflow-hidden rounded-lg border bg-background px-3 pt-3 text-foreground"
    >
      {/* Lights up briefly after a change; a fresh element per change restarts the animation */}
      {flash > 0 && <span key={flash} data-preview-flash className="pointer-events-none absolute inset-0 z-40 rounded-[inherit]" />}
      <div className="mx-auto w-[78%]" data-preview-page>
        {autoCover && <div className="h-7 rounded-md bg-linear-to-br from-sky-400 to-teal-300" />}
        <p className="mt-2 truncate font-page leading-tight font-bold" style={{ fontSize: 'calc(var(--page-text-size) * 0.85)' }}>
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
  )
}

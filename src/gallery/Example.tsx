import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** A part of the page: its heading (an anchor for the nav) and what it shows */
export function Section({ id, title, intro, children }: { id: string; title: string; intro?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 space-y-8">
      <div>
        <h2 id={`${id}-title`} className="font-page text-3xl font-bold tracking-tight">
          {title}
        </h2>
        {intro && <p className="mt-2 max-w-prose text-muted-foreground">{intro}</p>}
      </div>
      {children}
    </section>
  )
}

/** One example: a title, the file it comes from, and the component itself on a quiet panel */
export function Example({
  id,
  title,
  source,
  plain = false,
  className,
  children,
}: {
  id?: string
  title: string
  /** The file under src/ that has it */
  source: string
  /** Without the panel around it (for things with a frame of their own) */
  plain?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <div id={id} className="scroll-mt-24 space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h3 className="text-base font-semibold">{title}</h3>
        <code className="text-xs text-muted-foreground">{source}</code>
      </div>
      <div className={cn(!plain && 'rounded-xl border bg-background p-5', className)}>{children}</div>
    </div>
  )
}

/** A label under a sample */
export function Caption({ children }: { children: ReactNode }) {
  return <p className="mt-1.5 text-xs text-muted-foreground">{children}</p>
}

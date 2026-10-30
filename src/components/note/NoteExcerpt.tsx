import { Check } from 'lucide-react'
import { useLayoutEffect, useRef, useState, type RefObject } from 'react'
import type { ExcerptLine } from '@/lib/note-text'
import { CALLOUT_ICONS } from '@/lib/callout'
import { cn } from '@/lib/utils'

/**
 * A card's preview of a note in its own shape: headings a little stronger, list items with their bullet or number,
 * checklist items with their box (ticked ones struck through), quotes, code and callouts as they look on the page,
 * images as a small picture. When it runs past its box, the last line fades out (index.css) instead of being cut in half.
 */
export function NoteExcerpt({ lines, className }: { lines: ExcerptLine[]; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const overflowing = useOverflowing(ref)
  return (
    <div
      ref={ref}
      data-overflowing={overflowing || undefined}
      className={cn('note-excerpt min-h-0 overflow-hidden font-page text-sm leading-relaxed text-muted-foreground', className)}
    >
      {lines.map((line, i) => (
        <Line key={i} line={line} afterQuote={lines[i - 1]?.kind === 'quote'} />
      ))}
    </div>
  )
}

/** `afterQuote`: a quote line right after another one goes on without a mark of its own, as on the page */
function Line({ line, afterQuote }: { line: ExcerptLine; afterQuote: boolean }) {
  switch (line.kind) {
    case 'heading':
      return <p className="truncate font-medium text-foreground/80">{line.text}</p>
    case 'text':
      return <p className="line-clamp-3">{line.text}</p>
    case 'quote':
      return (
        <p className="flex gap-1 font-serif italic">
          <span aria-hidden className={cn('shrink-0 text-[color-mix(in_oklch,var(--joy)_75%,var(--foreground))] not-italic', afterQuote && 'invisible')}>
            “
          </span>
          <span className="min-w-0 truncate">{line.text}</span>
        </p>
      )
    case 'code':
      return <p className="my-0.5 truncate rounded-sm bg-foreground/5 px-1.5 font-mono text-xs leading-relaxed">{line.text}</p>
    case 'callout': {
      const Icon = CALLOUT_ICONS[line.tone]
      return (
        <p data-callout-tone={line.tone} className="my-0.5 flex items-center gap-1.5 rounded-sm bg-(--callout-fill) px-1.5">
          <Icon aria-hidden className="size-3 shrink-0 text-(--callout-ink)" />
          <span className="min-w-0 truncate">{line.text}</span>
        </p>
      )
    }
    case 'bullet':
    case 'number':
      return (
        <p className="flex gap-1.5">
          <span aria-hidden className="shrink-0 tabular-nums">
            {line.kind === 'number' ? `${line.n}.` : '•'}
          </span>
          <span className="min-w-0 truncate">{line.text}</span>
        </p>
      )
    case 'check':
      return (
        <p className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={cn(
              'flex size-3 shrink-0 items-center justify-center rounded-[3px] border',
              line.checked ? 'border-foreground/70 bg-foreground/70 text-background' : 'border-muted-foreground/70',
            )}
          >
            {line.checked && <Check className="size-2.5" strokeWidth={3.5} />}
          </span>
          <span className="sr-only">{line.checked ? 'Done:' : 'To do:'}</span>
          <span className={cn('min-w-0 truncate', line.checked && 'line-through decoration-muted-foreground/60')}>{line.text}</span>
        </p>
      )
    case 'image':
      return <img src={line.url} alt="" loading="lazy" draggable={false} className="my-1 h-12 w-auto max-w-full rounded-sm object-cover" />
  }
}

/** Whether the element's content is taller than the element (it follows resizing, e.g. of a board card) */
function useOverflowing(ref: RefObject<HTMLElement | null>) {
  const [overflowing, setOverflowing] = useState(false)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const check = () => setOverflowing(el.scrollHeight > el.clientHeight + 1)
    check()
    const observer = new ResizeObserver(check)
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
  return overflowing
}

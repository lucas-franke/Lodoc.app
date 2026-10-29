import { Check } from 'lucide-react'
import { useLayoutEffect, useRef, useState, type RefObject } from 'react'
import type { ExcerptLine } from '@/db/notes'
import { cn } from '@/lib/utils'

/**
 * A card's preview of a note in its own shape: headings a little stronger, list items with their bullet or number,
 * checklist items with their box (ticked ones struck through), images as a small picture. When it runs past its box,
 * the last line fades out (index.css) instead of being cut in half.
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
        <Line key={i} line={line} />
      ))}
    </div>
  )
}

function Line({ line }: { line: ExcerptLine }) {
  switch (line.kind) {
    case 'heading':
      return <p className="truncate font-medium text-foreground/80">{line.text}</p>
    case 'text':
      return <p className="line-clamp-3">{line.text}</p>
    case 'quote':
      return <p className="truncate border-l-2 border-muted-foreground/40 pl-2">{line.text}</p>
    case 'code':
      return <p className="truncate font-mono text-xs leading-relaxed">{line.text}</p>
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

import { OUTLINE_MIN, type OutlineItem } from '@/lib/outline'
import { cn } from '@/lib/utils'

/**
 * A slim list of the headings at the right edge of wide windows; clicking one scrolls to it. It only
 * appears where there is room next to the text, so it never covers it.
 */
export function NoteOutline({ items }: { items: OutlineItem[] }) {
  if (items.length < OUTLINE_MIN) return null
  const top = Math.min(...items.map((i) => i.level))
  return (
    <nav
      aria-label="Outline"
      data-outline
      className={cn(
        'fixed top-24 right-6 hidden max-h-[calc(100dvh-10rem)] w-48 overflow-y-auto',
        // room for the text column plus the outline on both sides
        '@min-[76rem]:block',
      )}
    >
      <p className="mb-2 text-xs font-medium text-muted-foreground">On this page</p>
      <ul className="space-y-1 border-l">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() =>
                document.querySelector(`.bn-editor [data-id="${CSS.escape(item.id)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
              className="-ml-px block w-full truncate border-l border-transparent py-0.5 pr-1 text-left text-xs text-muted-foreground outline-none hover:border-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
              style={{ paddingLeft: `${0.75 + (item.level - top) * 0.75}rem` }}
            >
              {item.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}

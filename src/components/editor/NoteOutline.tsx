import { ListTree } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { OUTLINE_MIN, type OutlineItem } from '@/lib/outline'
import { cn } from '@/lib/utils'

const scrollToHeading = (id: string) =>
  document.querySelector(`.bn-editor [data-id="${CSS.escape(id)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

/** The headings, indented by level; `large` gives touch-sized rows (in the sheet). */
function OutlineList({ items, onPick, large = false }: { items: OutlineItem[]; onPick: (id: string) => void; large?: boolean }) {
  const top = Math.min(...items.map((i) => i.level))
  return (
    <ul className="space-y-1 border-l">
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            onClick={() => onPick(item.id)}
            className={cn(
              '-ml-px block w-full truncate border-l border-transparent pr-1 text-left text-muted-foreground outline-none hover:border-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60',
              large ? 'py-2 text-sm' : 'py-0.5 text-xs',
            )}
            style={{ paddingLeft: `${0.75 + (item.level - top) * 0.75}rem` }}
          >
            {item.text}
          </button>
        </li>
      ))}
    </ul>
  )
}

/**
 * A slim list of the headings at the right edge of wide windows; clicking one scrolls to it. It only
 * appears where there is room next to the text, so it never covers it.
 */
export function NoteOutline({ items }: { items: OutlineItem[] }) {
  if (items.length < OUTLINE_MIN) return null
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
      <OutlineList items={items} onPick={scrollToHeading} />
    </nav>
  )
}

/**
 * Where the side outline has no room (phones, narrow windows): a button in the page info line that opens
 * the outline as a sheet from the bottom.
 */
export function OutlineButton({ items }: { items: OutlineItem[] }) {
  const [open, setOpen] = useState(false)
  // Scrolled to once the sheet has closed (focus would otherwise jump back to the button)
  const pending = useRef<string | null>(null)
  if (items.length < OUTLINE_MIN) return null
  return (
    <>
      <Button
        variant="ghost"
        size="icon-xs"
        className="-my-1 ml-auto @min-[76rem]:hidden pointer-coarse:size-9"
        aria-label="Outline"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <ListTree />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[70dvh] gap-0 rounded-t-xl pb-[env(safe-area-inset-bottom)]"
          onCloseAutoFocus={(e) => {
            if (!pending.current) return
            e.preventDefault()
            scrollToHeading(pending.current)
            pending.current = null
          }}
        >
          <SheetHeader>
            <SheetTitle>On this page</SheetTitle>
          </SheetHeader>
          <nav aria-label="Outline" className="overflow-y-auto px-4 pb-8">
            <OutlineList
              items={items}
              large
              onPick={(id) => {
                pending.current = id
                setOpen(false)
              }}
            />
          </nav>
        </SheetContent>
      </Sheet>
    </>
  )
}

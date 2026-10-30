import { FileText } from 'lucide-react'

/**
 * How a link to a note looks in the text: its title with a note icon, underlined; struck through when the note was
 * deleted. Display only (NoteLinkChip looks the note up; the components page shows it with a fixed title).
 */
export function NoteLinkChipView({ title, missing = false, href, onOpen }: { title: string; missing?: boolean; href: string; onOpen?: () => void }) {
  return (
    <a
      href={href}
      data-note-link
      onClick={(e) => {
        e.preventDefault()
        if (!missing) onOpen?.()
      }}
      className={
        missing
          ? 'rounded px-0.5 text-muted-foreground line-through decoration-muted-foreground/60'
          : 'inline-flex items-baseline gap-0.5 rounded px-0.5 font-medium text-foreground underline decoration-muted-foreground/50 underline-offset-2 hover:bg-muted hover:decoration-foreground'
      }
      title={missing ? 'This note was deleted' : undefined}
    >
      <FileText aria-hidden className="size-3.5 self-center text-muted-foreground" />
      {title}
    </a>
  )
}

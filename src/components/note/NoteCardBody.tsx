import { noteExcerpt, notePreview } from '@/lib/note-text'
import type { Note, NoteCardView } from '@/db/schema'
import { useAppearance } from '@/hooks/useAppearance'
import { resolveCover } from '@/lib/cover'
import { cn } from '@/lib/utils'
import { NoteCardFooter } from './NoteCardMeta'
import { NoteCover } from './NoteCover'
import { NoteExcerpt } from './NoteExcerpt'

// A note card, for each view, is its cover (NoteCardTop), then its title, then NoteCardBody:
// full = a cover you chose at full size (an automatic one as a thin band), the note's start in its own shape and a
//        footer line
// cover = the cover, automatic ones too (or, without any, a short text below the title)
// title = just the title
// The same pieces make folder cards (CardShell) and board cards (NoteNode). `fill`: the card has a fixed height
// (board), so the cover or the text takes the free space.

export function NoteCardTop({ note, view, fill = false }: { note: Note; view: NoteCardView; fill?: boolean }) {
  const { autoCover } = useAppearance()
  if (view === 'title') return null
  const cover = resolveCover(note, autoCover)
  if (!cover) return null
  if (view === 'cover') return <NoteCover cover={cover} className={fill ? 'min-h-0 flex-1' : 'aspect-[16/9] w-full shrink-0'} />
  if (cover.kind === 'gradient' && cover.auto) return <NoteCover cover={cover} className="h-1.5 w-full shrink-0" />
  // On a board card (fixed height) the cover leaves at least 60 % of the card to the text
  return <NoteCover cover={cover} className={cn('aspect-[16/7] w-full shrink-0', fill ? 'max-h-[40%]' : 'max-h-40')} />
}

export function NoteCardBody({
  note,
  view,
  fill = false,
  hideMeta = false,
  className,
}: {
  note: Note
  view: NoteCardView
  fill?: boolean
  /** Leave out the footer (board cards when zoomed far out, where it would be unreadable) */
  hideMeta?: boolean
  className?: string
}) {
  const { autoCover } = useAppearance()
  if (view === 'title') return null
  if (view === 'cover') {
    if (resolveCover(note, autoCover)) return null
    // No cover to show: a short text, so the card isn't bare
    return (
      <p className={cn('line-clamp-2 px-4 pb-3 font-page text-sm text-muted-foreground', fill && 'min-h-0 flex-1 overflow-hidden', className)}>
        {notePreview(note, 200) || 'Empty note'}
      </p>
    )
  }
  const lines = noteExcerpt(note)
  return (
    <div className={cn('flex min-h-0 flex-1 flex-col gap-2 px-4 pb-3', className)}>
      {lines.length ? (
        <NoteExcerpt lines={lines} className={fill ? 'flex-1' : 'max-h-32'} />
      ) : (
        <p className="font-page text-sm text-muted-foreground">Empty note</p>
      )}
      {!hideMeta && <NoteCardFooter note={note} />}
    </div>
  )
}

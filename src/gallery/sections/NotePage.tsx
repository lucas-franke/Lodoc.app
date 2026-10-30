import { Hash, X } from 'lucide-react'
import { NoteCover } from '@/components/note/NoteCover'
import { resolveCover } from '@/lib/cover'
import { plural } from '@/lib/format'
import { noteWordCount } from '@/lib/note-text'
import { GalleryEditor } from '../GalleryEditor'
import { EVERY_BLOCK, SCRATCHPAD } from '../samples'
import { Example, Section } from '../Example'

export function NotePage() {
  const cover = resolveCover(EVERY_BLOCK)
  return (
    <Section
      id="note"
      title="Note page"
      intro="A note with every kind of block, in the app's own editor. Type in it, select text for the toolbar, type / for the block menu, click a callout's icon to switch its tone. Nothing is saved."
    >
      <Example id="note-editor" title="A note" source="components/editor/NoteEditor.tsx, index.css" plain>
        <div className="relative overflow-hidden rounded-xl border bg-background" data-texture-surface="">
          {/* The page as NoteEditor lays it out: cover, title, the line under it, tags, then the text */}
          <div className="mx-auto w-full max-w-(--page-width) px-1 pt-10 pb-16 sm:px-12">
            {cover && (
              <div className="mb-6 h-48 overflow-hidden rounded-lg max-sm:h-32">
                <NoteCover cover={cover} className="size-full" />
              </div>
            )}
            <h3 className="mb-4 px-(--page-gutter) font-page text-4xl leading-tight font-bold tracking-tight text-balance max-sm:text-3xl">{EVERY_BLOCK.title}</h3>
            <p className="-mt-3 mb-3 px-(--page-gutter) text-xs text-muted-foreground">Edited just now · {plural(noteWordCount(EVERY_BLOCK), 'word')}</p>
            <ul className="-mt-1 mb-3 flex flex-wrap items-center gap-1.5 px-(--page-gutter)" aria-label="Tags">
              {['ideas', 'tag'].map((tag) => (
                <li key={tag} className="flex items-center gap-1 rounded-full border bg-muted/50 py-0.5 pr-1.5 pl-2 text-xs">
                  <Hash aria-hidden className="size-3 text-muted-foreground" />
                  {tag}
                  <X aria-hidden className="size-3 text-muted-foreground" />
                </li>
              ))}
            </ul>
            <GalleryEditor content={EVERY_BLOCK.content} />
          </div>
        </div>
      </Example>
      <Example id="scratchpad" title="Scratchpad" source="components/home/OverviewPad.tsx" plain>
        <div className="max-w-xl rounded-xl border bg-card px-1 py-2">
          <GalleryEditor content={SCRATCHPAD} compact />
        </div>
      </Example>
    </Section>
  )
}

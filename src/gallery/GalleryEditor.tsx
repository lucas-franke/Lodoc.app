import { BlockNoteSchema, defaultBlockSpecs, defaultInlineContentSpecs, isTouchDevice, type PartialBlock } from '@blocknote/core'
import {
  createReactInlineContentSpec,
  FormattingToolbar,
  FormattingToolbarController,
  SuggestionMenuController,
  useCreateBlockNote,
  useDictionary,
} from '@blocknote/react'
import { BlockNoteView } from '@blocknote/shadcn'
import '@blocknote/shadcn/style.css'
import { useTheme } from 'next-themes'
import { useRef } from 'react'
import { arrowsExtension } from '@/components/editor/arrows'
import { blockTypeItems, Callout } from '@/components/editor/Callout'
import { useChecklistJoy } from '@/components/editor/checklist-joy'
import { inlineTagsExtension } from '@/components/editor/inline-tags'
import { MobileFormatBar } from '@/components/editor/MobileFormatBar'
import { NoteLinkChipView } from '@/components/editor/NoteLinkChipView'
import { slashItems } from '@/components/editor/slash-items'
import { ABOVE_FORMAT_BAR } from '@/components/editor/touch-menus'
import type { StoredBlock } from '@/db/schema'
import { cn } from '@/lib/utils'

/** A link to a note, shown with the title it was linked with (there are no notes to look up here) */
const NoteLink = createReactInlineContentSpec(
  { type: 'noteLink', propSchema: { noteId: { default: '' }, title: { default: '' } }, content: 'none' } as const,
  { render: ({ inlineContent }) => <NoteLinkChipView href="#note" title={inlineContent.props.title || 'Untitled'} /> },
)

/** The app's blocks (editor/schema.tsx): BlockNote's own, callouts and note links */
const schema = BlockNoteSchema.create({
  blockSpecs: { ...defaultBlockSpecs, callout: Callout() },
  inlineContentSpecs: { ...defaultInlineContentSpecs, noteLink: NoteLink },
})

/**
 * The note editor of the app, in memory: the same blocks, styles, "/" menu, toolbar and format bar, on sample content.
 * Nothing is saved, and a reload starts over. `compact` is the look of a board card or the overview's Scratchpad.
 */
export function GalleryEditor({ content, compact = false }: { content: StoredBlock[]; compact?: boolean }) {
  const { resolvedTheme } = useTheme()
  const editor = useCreateBlockNote({
    schema,
    initialContent: content as PartialBlock<typeof schema.blockSchema, typeof schema.inlineContentSchema, typeof schema.styleSchema>[],
    extensions: [arrowsExtension, inlineTagsExtension],
    domAttributes: { editor: { 'aria-label': 'Sample note' } },
  })
  const ref = useRef<HTMLDivElement>(null)
  useChecklistJoy(ref)
  const formatBar = !compact && isTouchDevice()
  return (
    <div ref={ref} className={cn(compact && 'bn-embedded')}>
      <BlockNoteView editor={editor} sideMenu={!compact} formattingToolbar={false} slashMenu={false} theme={resolvedTheme === 'dark' ? 'dark' : 'light'}>
        <SuggestionMenuController
          triggerCharacter="/"
          floatingUIOptions={formatBar ? ABOVE_FORMAT_BAR : undefined}
          getItems={async (query) => slashItems(editor as never, query, formatBar)}
        />
        {formatBar ? <MobileFormatBar /> : <FormattingToolbarController formattingToolbar={Toolbar} />}
      </BlockNoteView>
    </div>
  )
}

/** BlockNote's toolbar with callouts in its block type menu, like the app's */
function Toolbar() {
  return <FormattingToolbar blockTypeSelectItems={blockTypeItems(useDictionary())} />
}

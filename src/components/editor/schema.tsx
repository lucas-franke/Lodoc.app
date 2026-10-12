import { BlockNoteSchema, defaultInlineContentSpecs } from '@blocknote/core'
import { createReactInlineContentSpec } from '@blocknote/react'
import { NoteLinkChip } from './NoteLinkChip'

/**
 * A link to another note, inserted with "@". It shows the linked note's current title (so renames carry over)
 * and keeps the title it had when linked as a fallback, for search and for exports ("[[Title]]").
 */
export const NoteLink = createReactInlineContentSpec(
  {
    type: 'noteLink',
    propSchema: { noteId: { default: '' }, title: { default: '' } },
    content: 'none',
  } as const,
  {
    render: ({ inlineContent }) => <NoteLinkChip noteId={inlineContent.props.noteId} fallback={inlineContent.props.title} />,
    // Markdown export: a wiki-style link, which other note apps understand too
    toExternalHTML: ({ inlineContent }) => <span>[[{inlineContent.props.title || 'Untitled'}]]</span>,
  },
)

/** The editor schema: BlockNote's defaults plus note links */
export const editorSchema = BlockNoteSchema.create({
  inlineContentSpecs: { ...defaultInlineContentSpecs, noteLink: NoteLink },
})

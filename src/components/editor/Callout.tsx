import type { Dictionary } from '@blocknote/core'
import { blockTypeSelectItems, createReactBlockSpec, type BlockTypeSelectItem } from '@blocknote/react'
import { Lightbulb } from 'lucide-react'
import { CALLOUT_ICONS, CALLOUT_INFO, CALLOUT_TONES, nextTone, type CalloutTone } from '@/lib/callout'

/**
 * A box that stands out from the text, for a tip, a warning or a key point: a soft fill in one of four tones, with
 * an icon that switches to the next tone when clicked. Downloaded as a Markdown callout ("> [!TIP]").
 */
export const Callout = createReactBlockSpec(
  {
    type: 'callout',
    propSchema: { tone: { default: 'neutral' as CalloutTone, values: CALLOUT_TONES } },
    content: 'inline',
  },
  {
    render: ({ block, editor, contentRef }) => {
      const tone = block.props.tone
      const Icon = CALLOUT_ICONS[tone]
      return (
        <div className="callout" data-callout-tone={tone}>
          <button
            type="button"
            contentEditable={false}
            className="callout-icon"
            disabled={!editor.isEditable}
            aria-label={`${CALLOUT_INFO[tone].name} (change)`}
            title={editor.isEditable ? `${CALLOUT_INFO[tone].name}: click for ${CALLOUT_INFO[nextTone(tone)].name}` : undefined}
            onClick={() => editor.updateBlock(block, { props: { tone: nextTone(tone) } })}
          >
            <Icon aria-hidden />
          </button>
          <div ref={contentRef} className="callout-text" />
        </div>
      )
    },
    // Markdown export: a quote starting with "[!TIP]" (export-markdown.ts takes out the escaping)
    toExternalHTML: ({ block, contentRef }) => (
      <blockquote>
        <p>[!{CALLOUT_INFO[block.props.tone].alert}]</p>
        <p ref={contentRef} />
      </blockquote>
    ),
  },
)

/** The items of the block type menus (the toolbar's and the phone's format bar), with the callout after the quote */
export function blockTypeItems(dictionary: Dictionary): BlockTypeSelectItem[] {
  const items = blockTypeSelectItems(dictionary)
  const callout: BlockTypeSelectItem = { name: 'Callout', type: 'callout', icon: Lightbulb as BlockTypeSelectItem['icon'] }
  items.splice(items.findIndex((item) => item.type === 'quote') + 1, 0, callout)
  return items
}

import type { BlockNoteEditor } from '@blocknote/core'
import { filterSuggestionItems, insertOrUpdateBlockForSlashMenu } from '@blocknote/core/extensions'
import { getDefaultReactSlashMenuItems, type DefaultReactSuggestionItem } from '@blocknote/react'
import { Lightbulb } from 'lucide-react'
import type { editorSchema } from './schema'

type Editor = BlockNoteEditor<typeof editorSchema.blockSchema, typeof editorSchema.inlineContentSchema, typeof editorSchema.styleSchema>

/** The "/" menu: BlockNote's own items with a callout after the quote */
function allItems(editor: Editor): DefaultReactSuggestionItem[] {
  // BlockNote's code block promises syntax highlighting, which Lodoc doesn't load
  const codeTitle = editor.dictionary.slash_menu.code_block.title
  const items = getDefaultReactSlashMenuItems(editor).map((item) => (item.title === codeTitle ? { ...item, subtext: 'Code or a snippet' } : item))
  const callout: DefaultReactSuggestionItem = {
    title: 'Callout',
    subtext: 'A box that stands out, for a tip or a warning',
    aliases: ['callout', 'box', 'note', 'tip', 'warning', 'info', 'aside'],
    group: 'Basic blocks',
    icon: <Lightbulb size={18} />,
    onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: 'callout' }),
  }
  const quote = items.findIndex((item) => item.title === editor.dictionary.slash_menu.quote.title)
  items.splice(quote + 1, 0, callout)
  return items
}

/** The items matching what was typed after "/"; `brief` (phones) leaves out the line under each name, so more fit above the keyboard */
export function slashItems(editor: Editor, query: string, brief: boolean) {
  const items = filterSuggestionItems(allItems(editor), query)
  return brief ? items.map((item) => ({ ...item, subtext: undefined })) : items
}

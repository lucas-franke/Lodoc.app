import { createExtension, type BlockNoteEditor } from '@blocknote/core'

// An empty line can always be deleted from inside it. BlockNote's Backspace merges a line into the one above,
// so in the first line it did nothing, and Delete in an empty line didn't take it out either.

type AnyEditor = BlockNoteEditor<any, any, any>

/** The empty paragraph the (collapsed) cursor is in and the block after it, if there is one */
function emptyLineAtCursor(editor: AnyEditor) {
  const { selection } = editor.prosemirrorState
  if (!selection.empty) return undefined
  const { block, nextBlock } = editor.getTextCursorPosition()
  const empty = block.type === 'paragraph' && Array.isArray(block.content) && !block.content.length && !block.children.length
  return empty && nextBlock ? { block, nextBlock } : undefined
}

function removeLine(editor: AnyEditor, line: NonNullable<ReturnType<typeof emptyLineAtCursor>>) {
  editor.removeBlocks([line.block])
  editor.setTextCursorPosition(line.nextBlock, 'start')
  return true
}

export const emptyLinesExtension = createExtension({
  key: 'emptyLines',
  keyboardShortcuts: {
    // Only the first line: anywhere else Backspace already merges the empty line into the one above
    Backspace: ({ editor }) => {
      const line = emptyLineAtCursor(editor)
      return !!line && line.block.id === editor.document[0]?.id && removeLine(editor, line)
    },
    Delete: ({ editor }) => {
      const line = emptyLineAtCursor(editor)
      return !!line && removeLine(editor, line)
    },
  },
})

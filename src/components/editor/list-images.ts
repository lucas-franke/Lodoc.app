import type { BlockNoteEditor } from '@blocknote/core'

// Loosely typed: these helpers only look at block types, not at the note schema
type Editor = BlockNoteEditor<any, any, any> // eslint-disable-line @typescript-eslint/no-explicit-any

const LIST_ITEMS = new Set(['bulletListItem', 'numberedListItem', 'checkListItem', 'toggleListItem'])
const FILE_BLOCKS = new Set(['image', 'video', 'audio', 'file'])

/** The selected image (or other file block), if one is selected as a whole */
function selectedFileBlock(editor: Editor) {
  if (!('node' in editor.prosemirrorState.selection)) return undefined
  const block = editor.getTextCursorPosition().block
  return FILE_BLOCKS.has(block.type) ? block : undefined
}

/**
 * Tab / Shift+Tab indent and outdent a selected image, e.g. into a list. BlockNote leaves Tab to the
 * image toolbar while one is selected, so images could never be indented. Call on keydown before the
 * editor sees it (capture phase).
 */
export function indentSelectedFile(editor: Editor, e: KeyboardEvent) {
  if (e.key !== 'Tab' || e.ctrlKey || e.metaKey || e.altKey || !selectedFileBlock(editor)) return
  const move = e.shiftKey ? editor.canUnnestBlock() && (() => editor.unnestBlock()) : editor.canNestBlock() && (() => editor.nestBlock())
  if (!move) return
  e.preventDefault()
  e.stopPropagation()
  move()
}

/**
 * An image added from a list item (the "/image" command on an empty item, or pasted or dropped onto one)
 * goes under that item instead of breaking the list in two. Shift+Tab moves it back out.
 */
export function nestImagesAddedInLists(editor: Editor) {
  // Blocks just moved here: their own insertion must not move them again (e.g. into a sub-list)
  const moved = new Set<string>()
  return editor.onChange((_, { getChanges }) => {
    for (const change of getChanges()) {
      if (!['local', 'paste', 'drop'].includes(change.source.type) || !FILE_BLOCKS.has(change.block.type)) continue
      if (moved.has(change.block.id)) continue
      const fromList = change.type === 'insert' || (change.type === 'update' && LIST_ITEMS.has(change.prevBlock.type))
      if (!fromList) continue
      const { id } = change.block
      moved.add(id)
      setTimeout(() => moved.delete(id))
      // Not while BlockNote is still reporting this change
      queueMicrotask(() => {
        const block = editor.getBlock(id)
        const item = block && editor.getPrevBlock(block)
        if (!block || !item || !LIST_ITEMS.has(item.type)) return
        editor.transact(() => {
          editor.removeBlocks([id])
          editor.updateBlock(item.id, { children: [...item.children, block] })
        })
      })
    }
  })
}

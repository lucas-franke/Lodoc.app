import { createExtension } from '@blocknote/core'
import type { Node as PMNode } from '@tiptap/pm/model'
import { Plugin, PluginKey, type EditorState, type Transaction } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { normalizeTag } from '@/lib/note-text'
import { openTag } from '@/hooks/useRoute'

// #tags written in the text: "#idea" in a note adds the tag "idea" (and taking it out of the text removes it
// again; tags added in the tag field are never touched). The tags show as tags in the text, Ctrl/Cmd+click opens
// one, and typing # after a space offers the tags already in use (tag-menu.ts). Not in code, and a number alone (#1)
// is no tag.

/** "#" after the start of the text, a space or an opening bracket, then letters/digits/_-/ with at least one letter */
const TAG = /(^|[\s([{])#([\p{L}\p{N}_/-]*\p{L}[\p{L}\p{N}_/-]*)/gu

type Found = { tag: string; from: number; to: number }

/** The text of a block with code (and links) blanked out, so positions still line up with the document */
function plainText(block: PMNode) {
  let text = ''
  block.forEach((child) => {
    const skip = child.marks.some((m) => m.type.name === 'code' || m.type.name === 'link')
    const part = child.isText ? child.text! : ' '.repeat(child.nodeSize)
    text += skip ? ' '.repeat(part.length) : part
  })
  return text
}

/** Every #tag in the document with its position; code blocks are skipped */
function findTags(doc: PMNode): Found[] {
  const found: Found[] = []
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true
    if (node.type.spec.code) return false
    const text = plainText(node)
    for (const m of text.matchAll(TAG)) {
      const from = pos + 1 + m.index + m[1].length
      found.push({ tag: normalizeTag(m[2]), from, to: from + 1 + m[2].length })
    }
    return false
  })
  return found.filter((f) => f.tag)
}

/**
 * The tags written in the text. The one being typed right now (the caret at its end) doesn't count yet, so
 * typing "#idea" doesn't add "i", "id" and "ide" on the way.
 */
export function inlineTags(state: EditorState): Set<string> {
  const caret = state.selection.empty ? state.selection.from : -1
  return new Set(findTags(state.doc).filter((f) => f.to !== caret).map((f) => f.tag))
}

const key = new PluginKey('inlineTags')

export const inlineTagsExtension = createExtension({
  key: 'inlineTags',
  prosemirrorPlugins: [
    new Plugin({
      key,
      props: {
        decorations: (state) =>
          DecorationSet.create(
            state.doc,
            findTags(state.doc).map((f) =>
              Decoration.inline(f.from, f.to, {
                class: 'inline-tag',
                'data-tag': f.tag,
                title: `Ctrl+click to see all notes tagged #${f.tag}`,
              }),
            ),
          ),
        handleClick: (_view, _pos, event) => {
          if (!(event.ctrlKey || event.metaKey)) return false
          const tag = (event.target as HTMLElement | null)?.closest<HTMLElement>('.inline-tag')?.dataset.tag
          if (!tag) return false
          openTag(tag)
          return true
        },
      },
    }),
  ],
})

/** The "#" menu opens after a space (or a bracket) only: "#" at the start of a line followed by a space is a heading */
export function tagMenuShouldOpen(tr: Transaction) {
  const { $from } = tr.selection
  if ($from.parent.type.spec.code) return false
  const before = $from.parent.textBetween(Math.max(0, $from.parentOffset - 1), $from.parentOffset)
  return $from.parentOffset > 0 && /[\s([{]/.test(before)
}

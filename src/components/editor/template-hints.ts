import { createExtension } from '@blocknote/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { HEADING_HINTS } from '@/lib/templates'

// An empty line right under a template heading ("Attendees", "Action items", …) says what goes there,
// instead of BlockNote's generic "List" or "Enter text". The hint is a decoration (data-hint), shown by the
// placeholder rule in index.css; nothing is stored in the note, and it goes away as soon as you type.

const key = new PluginKey('templateHints')

export const templateHintsExtension = createExtension({
  key: 'templateHints',
  prosemirrorPlugins: [
    new Plugin({
      key,
      props: {
        decorations: (state) => {
          // doc > blockGroup > blockContainer > blockContent; only top-level lines (templates are flat)
          const group = state.doc.firstChild
          if (!group) return null
          const decorations: Decoration[] = []
          let hint: string | undefined
          group.forEach((container, offset) => {
            const content = container.firstChild
            if (!content) return
            const pos = 1 + offset + 1
            if (hint && content.isTextblock && content.content.size === 0) {
              decorations.push(Decoration.node(pos, pos + content.nodeSize, { 'data-hint': hint }))
            }
            hint = content.type.name === 'heading' ? HEADING_HINTS[content.textContent.trim().toLowerCase()] : undefined
          })
          return DecorationSet.create(state.doc, decorations)
        },
      },
    }),
  ],
})

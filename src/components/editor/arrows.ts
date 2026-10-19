import { createExtension } from '@blocknote/core'
import { Extension, InputRule } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

// Typed arrows become arrow characters as you write (like Figma): -> → , <- ← , <-> ↔ , => ⇒ , <=> ⇔ .
// Backspace right after a replacement brings back what was typed (BlockNote's Backspace undoes input rules
// first). Code blocks and inline code are left alone: tiptap skips input rules there, and an inline code span
// that is still being typed (an opening ` with no closing one yet on the line) counts as code too.
// The new arrow glows for a moment (.joy-flash in index.css), so the change is noticed and feels intended.

type Flash = { decorations: DecorationSet; id: number }
const flashKey = new PluginKey<Flash>('arrowFlash')
const FLASH_MS = 600

/** Holds the glow on a just-replaced arrow until it is cleared a moment later */
const flashPlugin = new Plugin<Flash>({
  key: flashKey,
  state: {
    init: () => ({ decorations: DecorationSet.empty, id: 0 }),
    apply: (tr, flash) => {
      const meta = tr.getMeta(flashKey) as { from: number; to: number } | 'clear' | undefined
      if (meta === 'clear') return { decorations: DecorationSet.empty, id: flash.id }
      if (meta) return { decorations: DecorationSet.create(tr.doc, [Decoration.inline(meta.from, meta.to, { class: 'joy-flash' })]), id: flash.id + 1 }
      const decorations = flash.decorations.map(tr.mapping, tr.doc)
      // Gone once the arrow is (Backspace right after it brings back what was typed)
      const kept = decorations.find().every((d) => ARROWS.has(tr.doc.textBetween(d.from, d.to)))
      return { decorations: kept ? decorations : DecorationSet.empty, id: flash.id }
    },
  },
  props: { decorations: (state) => flashKey.getState(state)?.decorations },
  view: () => {
    let timer: number | undefined
    return {
      // A new flash (not every keystroke while one shows) starts the timer that clears it
      update: (view, previous) => {
        if (flashKey.getState(view.state)?.id === flashKey.getState(previous)?.id) return
        window.clearTimeout(timer)
        timer = window.setTimeout(() => view.dispatch(view.state.tr.setMeta(flashKey, 'clear')), FLASH_MS)
      },
      destroy: () => window.clearTimeout(timer),
    }
  },
})

/** Checked in order, the first match wins: the longer forms come before the arrows they contain */
const RULES: [RegExp, string][] = [
  [/<=>$/, '⇔'],
  [/=>$/, '⇒'],
  // "<-" has already become "←" by the time the ">" of "<->" is typed
  [/<->$/, '↔'],
  [/←>$/, '↔'],
  [/-->$/, '→'],
  [/->$/, '→'],
  [/<-$/, '←'],
]
const ARROWS = new Set(RULES.map(([, arrow]) => arrow))

export const arrowsExtension = createExtension({
  key: 'arrows',
  tiptapExtensions: [
    Extension.create({
      name: 'arrows',
      addProseMirrorPlugins: () => [flashPlugin],
      addInputRules: () =>
        RULES.map(
          ([find, replace]) =>
            new InputRule({
              find,
              handler: ({ state, range }) => {
                const lineStart = state.selection.$from.start()
                const before = state.doc.textBetween(lineStart, range.from)
                if ((before.match(/`/g)?.length ?? 0) % 2) return null
                state.tr.insertText(replace, range.from, range.to)
                state.tr.setMeta(flashKey, { from: range.from, to: range.from + replace.length })
              },
            }),
        ),
    }),
  ],
})

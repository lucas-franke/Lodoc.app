import { createExtension } from '@blocknote/core'
import { Extension, InputRule } from '@tiptap/core'

// Typed arrows become arrow characters as you write (like Figma): -> → , <- ← , <-> ↔ , => ⇒ , <=> ⇔ .
// Backspace right after a replacement brings back what was typed (BlockNote's Backspace undoes input rules
// first). Code blocks and inline code are left alone: tiptap skips input rules there, and an inline code span
// that is still being typed (an opening ` with no closing one yet on the line) counts as code too.

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

export const arrowsExtension = createExtension({
  key: 'arrows',
  tiptapExtensions: [
    Extension.create({
      name: 'arrows',
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
              },
            }),
        ),
    }),
  ],
})

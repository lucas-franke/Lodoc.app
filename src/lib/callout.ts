import { CircleCheck, Info, Lightbulb, TriangleAlert, type LucideIcon } from 'lucide-react'

// A callout's tones (components/editor/Callout.tsx; cards show them too), and how they map to Markdown's callouts
// ("> [!TIP]", which GitHub and Obsidian show as boxes): written that way when a note is downloaded, and read back
// when Markdown is imported.

export const CALLOUT_TONES = ['neutral', 'tint', 'green', 'warm'] as const
export type CalloutTone = (typeof CALLOUT_TONES)[number]

/** What each tone is called (its icon's button says it) and the callout type it is written as */
export const CALLOUT_INFO: Record<CalloutTone, { name: string; alert: string }> = {
  neutral: { name: 'Note', alert: 'NOTE' },
  tint: { name: 'Tip', alert: 'TIP' },
  green: { name: 'Success', alert: 'SUCCESS' },
  warm: { name: 'Warning', alert: 'WARNING' },
}

/** Each tone's icon */
export const CALLOUT_ICONS: Record<CalloutTone, LucideIcon> = {
  neutral: Info,
  tint: Lightbulb,
  green: CircleCheck,
  warm: TriangleAlert,
}

/** The tone after this one (a click on the icon) */
export const nextTone = (tone: CalloutTone) => CALLOUT_TONES[(CALLOUT_TONES.indexOf(tone) + 1) % CALLOUT_TONES.length]

/** GitHub's and Obsidian's callout types, each as the closest tone; unknown types are a plain note */
const TONE_OF_TYPE: Record<string, CalloutTone> = {
  tip: 'tint', hint: 'tint', important: 'tint',
  success: 'green', check: 'green', done: 'green',
  warning: 'warm', caution: 'warm', attention: 'warm', danger: 'warm', error: 'warm', bug: 'warm', failure: 'warm', fail: 'warm', missing: 'warm',
}

/** "[!TIP]" at the start of a quote (Obsidian also allows "+" or "-" after it, for folding) */
const MARKER = /^\[!([a-z]+)\][+-]?[ \t]*(?:\n[ \t]*)?/i

type Inline = { type: string; text?: string }
type Block = { type: string; props?: Record<string, unknown>; content?: unknown }

/** A quote that starts with a callout marker becomes a callout of that tone, without the marker */
export function quoteToCallout(block: Block) {
  if (block.type !== 'quote' || !Array.isArray(block.content)) return
  const first = block.content[0] as Inline | undefined
  const match = first?.type === 'text' && first.text ? MARKER.exec(first.text) : null
  if (!match) return
  first!.text = first!.text!.slice(match[0].length)
  if (!first!.text) block.content.shift()
  block.type = 'callout'
  block.props = { tone: TONE_OF_TYPE[match[1].toLowerCase()] ?? 'neutral' }
}

/** The converter puts an empty line after the marker (and may escape it: "\[!TIP]"); this writes it as it should be */
export function fixCalloutMarkdown(markdown: string) {
  return markdown.replace(/^> \\?\[!([A-Z]+)\]\n> ?\n/gm, '> [!$1]\n')
}

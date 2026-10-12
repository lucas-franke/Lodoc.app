import type { StoredBlock } from '@/db/schema'

// Small builders for note content written in code (the guide, templates), in BlockNote's stored format.

type Run = string | { text: string; code?: boolean; bold?: boolean }
const inline = (runs: Run[]) =>
  runs
    .filter((r) => (typeof r === 'string' ? r : r.text) !== '')
    .map((r) =>
      typeof r === 'string'
        ? { type: 'text', text: r, styles: {} }
        : { type: 'text', text: r.text, styles: { ...(r.code ? { code: true } : {}), ...(r.bold ? { bold: true } : {}) } },
    )
const block = (type: string, runs: Run[], props: Record<string, unknown> = {}) =>
  ({ type, props, content: inline(runs), children: [] }) as unknown as StoredBlock

export const h = (level: number, text: string) => block('heading', [text], { level })
export const p = (...runs: Run[]) => block('paragraph', runs)
export const li = (...runs: Run[]) => block('bulletListItem', runs)
export const todo = (text = '') => block('checkListItem', [text], { checked: false })

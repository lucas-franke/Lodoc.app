// "Tidy up": the items of a board in neat rows, without overlaps. The order is the one they are read in now
// (top to bottom, left to right), so a rough arrangement survives. Items on a frame stay on it: they are tidied
// inside it, and the frame is resized around them.

export type TidyItem = { id: string; frame: boolean; x: number; y: number; width: number; height: number }
export type TidyBox = { x: number; y: number; width: number; height: number }

const GAP = 32
/** Room around the items on a frame; more at the top for its name (as when a frame is drawn around items) */
const FRAME_PAD = 32
const FRAME_TOP = FRAME_PAD + 40
/** The rows aim for a landscape block, about the shape of a screen */
const ASPECT = 1.6

const contains = (outer: TidyItem, inner: TidyItem) =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.width <= outer.x + outer.width &&
  inner.y + inner.height <= outer.y + outer.height

/** Top to bottom in rows (an item belongs to a row when it starts above the middle of the row's first item), each row left to right */
function readingOrder(items: TidyItem[]): TidyItem[] {
  const byTop = [...items].sort((a, b) => a.y - b.y || a.x - b.x)
  const rows: TidyItem[][] = []
  for (const item of byTop) {
    const row = rows[rows.length - 1]
    if (row && item.y < row[0].y + row[0].height / 2) row.push(item)
    else rows.push([item])
  }
  return rows.flatMap((row) => row.sort((a, b) => a.x - b.x))
}

type Sized = { id: string; width: number; height: number }

/**
 * Places sized items left to right in rows; positions relative to the block's top-left. Of the possible row
 * lengths (1, 2, 3… items in the first row), the one whose block is closest to the ASPECT shape wins.
 */
function shelf(items: Sized[]) {
  let best = rows(items, Infinity)
  let rowWidth = -GAP
  for (const item of items) {
    rowWidth += GAP + item.width
    const candidate = rows(items, rowWidth)
    const off = (l: ReturnType<typeof rows>) => Math.abs(Math.log(l.width / Math.max(l.height, 1) / ASPECT))
    if (off(candidate) < off(best)) best = candidate
  }
  return best
}

function rows(items: Sized[], maxWidth: number) {
  const positions = new Map<string, { x: number; y: number }>()
  let x = 0
  let y = 0
  let rowHeight = 0
  let width = 0
  for (const item of items) {
    if (x > 0 && x + item.width > maxWidth) {
      x = 0
      y += rowHeight + GAP
      rowHeight = 0
    }
    positions.set(item.id, { x, y })
    width = Math.max(width, x + item.width)
    rowHeight = Math.max(rowHeight, item.height)
    x += item.width + GAP
  }
  return { positions, width, height: y + rowHeight }
}

/** New boxes for the items that move (frames also get a new size); the block starts where the items started */
export function tidyLayout(items: TidyItem[]): Map<string, TidyBox> {
  const frames = items.filter((i) => i.frame)
  // Each item belongs to the smallest frame it lies on (frames can lie on frames)
  const parent = new Map<string, string | null>()
  for (const item of items) {
    const holders = frames.filter((f) => f.id !== item.id && contains(f, item) && !(item.frame && contains(item, f)))
    holders.sort((a, b) => a.width * a.height - b.width * b.height)
    parent.set(item.id, holders[0]?.id ?? null)
  }
  const childrenOf = (id: string | null) => items.filter((i) => parent.get(i.id) === id)

  // Sizes from the inside out: a frame with items is as big as its tidied items plus its padding
  const layouts = new Map<string, ReturnType<typeof shelf>>()
  const size = (item: TidyItem): { width: number; height: number } => {
    const children = item.frame ? childrenOf(item.id) : []
    if (!children.length) return { width: item.width, height: item.height }
    const layout = shelf(readingOrder(children).map((c) => ({ id: c.id, ...size(c) })))
    layouts.set(item.id, layout)
    return { width: layout.width + 2 * FRAME_PAD, height: layout.height + FRAME_TOP + FRAME_PAD }
  }

  const result = new Map<string, TidyBox>()
  const place = (group: TidyItem[], originX: number, originY: number) => {
    const ordered = readingOrder(group)
    const sizes = new Map(ordered.map((i) => [i.id, size(i)]))
    const { positions } = shelf(ordered.map((i) => ({ id: i.id, ...sizes.get(i.id)! })))
    for (const item of ordered) {
      const at = positions.get(item.id)!
      const box = { x: originX + at.x, y: originY + at.y, ...sizes.get(item.id)! }
      result.set(item.id, box)
      if (layouts.has(item.id)) place(childrenOf(item.id), box.x + FRAME_PAD, box.y + FRAME_TOP)
    }
  }
  const top = childrenOf(null)
  if (top.length) place(top, Math.min(...top.map((i) => i.x)), Math.min(...top.map((i) => i.y)))
  return result
}

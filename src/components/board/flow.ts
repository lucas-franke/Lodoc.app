import type { Edge, Node } from '@xyflow/react'
import { noteTitle } from '@/lib/note-text'
import type { BoardEdge, BoardNode, Note, NoteCardView } from '@/db/schema'

/**
 * A React Flow node whose `data` is the board node itself. Position and size live on the
 * React Flow node while interacting; `data.x/y/width/height` are stale and overwritten on save.
 */
export type BoardFlowNode = Node<BoardNode>

/**
 * Frames lie behind everything else. React Flow lifts a selected item by 1000, so a selected frame ends up
 * level with the other items and, being earlier in the array, still below them.
 */
const FRAME_Z = -1000

export function toFlowNode(n: BoardNode): BoardFlowNode {
  return {
    id: n.id,
    type: n.type,
    position: { x: n.x, y: n.y },
    width: n.width,
    height: n.height,
    data: n,
    ...(n.type === 'frame' ? { zIndex: FRAME_Z } : {}),
  }
}

/** An arrow on the canvas; `data` holds the label */
export type BoardFlowEdge = Edge<{ label?: string }>

export const toFlowEdge = (e: BoardEdge): BoardFlowEdge => ({
  id: e.id,
  source: e.source,
  target: e.target,
  type: 'arrow',
  data: { label: e.label },
})

export const toBoardEdge = (e: BoardFlowEdge): BoardEdge => ({
  id: e.id,
  source: e.source,
  target: e.target,
  ...(e.data?.label ? { label: e.data.label } : {}),
})

/** Frames first, so they stay behind the items on top of them */
export const framesFirst = <T extends { data: BoardNode }>(nodes: T[]) => [
  ...nodes.filter((n) => n.data.type === 'frame'),
  ...nodes.filter((n) => n.data.type !== 'frame'),
]

/** The items lying completely inside a frame (they move with it) */
export function insideFrame(frame: BoardFlowNode, nodes: BoardFlowNode[]): BoardFlowNode[] {
  const fx = frame.position.x
  const fy = frame.position.y
  const fw = frame.width ?? frame.measured?.width ?? frame.data.width
  const fh = frame.height ?? frame.measured?.height ?? frame.data.height
  return nodes.filter((n) => {
    if (n.id === frame.id) return false
    const w = n.width ?? n.measured?.width ?? n.data.width
    const h = n.height ?? n.measured?.height ?? n.data.height
    return n.position.x >= fx && n.position.y >= fy && n.position.x + w <= fx + fw && n.position.y + h <= fy + fh
  })
}

export function toBoardNode(n: BoardFlowNode): BoardNode {
  return {
    ...n.data,
    x: n.position.x,
    y: n.position.y,
    width: n.width ?? n.measured?.width ?? n.data.width,
    height: n.height ?? n.measured?.height ?? n.data.height,
  }
}

/** Height of a note card in the 'title' view: just its header (40px) plus the border */
export const TITLE_HEIGHT = 42
/** Height a collapsed card gets back when it has no remembered one */
export const DEFAULT_CARD_HEIGHT = 240

export function cardView(n: BoardNode): NoteCardView {
  return n.type === 'note' ? (n.view ?? 'full') : 'full'
}

/**
 * The node switched to another card view. Title cards collapse to their header and remember their
 * height so the card comes back the same size; other nodes are returned unchanged.
 */
export function withCardView(n: BoardFlowNode, view: NoteCardView): BoardFlowNode {
  const data = n.data
  if (data.type !== 'note' || cardView(data) === view) return n
  const { restoreHeight, ...rest } = data
  const height = n.height ?? n.measured?.height ?? data.height
  const next = { ...rest, view: view === 'full' ? undefined : view }
  if (view === 'title') {
    return { ...n, height: TITLE_HEIGHT, data: { ...next, restoreHeight: height } as BoardNode }
  }
  return {
    ...n,
    height: cardView(data) === 'title' ? (restoreHeight ?? DEFAULT_CARD_HEIGHT) : height,
    data: next as BoardNode,
  }
}

/** A short name for an item, for arrow labels, "Connect to…" and find on board */
export function itemLabel(n: BoardNode, notes: Map<string, Note>): string {
  switch (n.type) {
    case 'note': {
      const note = notes.get(n.noteId)
      return note ? noteTitle(note) : 'Deleted note'
    }
    case 'text':
      return n.text.trim().split('\n')[0] || 'Text'
    case 'frame':
      return frameTitle(n.title)
    case 'image':
      return n.alt || 'Image'
  }
}

export const frameTitle = (title: string) => title.trim() || 'Untitled frame'

import '@xyflow/react/dist/style.css'
import { useDroppable } from '@dnd-kit/core'
import {
  Background,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type XYPosition,
} from '@xyflow/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { nanoid } from 'nanoid'
import { useTheme } from 'next-themes'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useRegisterCanvasDrop } from '@/components/dnd/dnd-registry'
import type { DndData } from '@/components/sidebar/tree-dnd'
import { addImageAsset, isImageFile } from '@/db/assets'
import { updateBoard } from '@/db/boards'
import { db } from '@/db/db'
import type { Board, BoardNode, Note, NoteCardView } from '@/db/schema'
import { cn } from '@/lib/utils'
import { ArrowEdge } from './ArrowEdge'
import { BoardContext, type Box } from './board-context'
import { BoardFab } from './BoardFab'
import { CardViewMenu } from './CardViewMenu'
import { ConnectPicker } from './ConnectPicker'
import { NodeSearch } from './NodeSearch'
import { useMinimapSetting } from './use-minimap'
import { ZoomSlider } from './ZoomSlider'
import {
  DEFAULT_CARD_HEIGHT,
  TITLE_HEIGHT,
  framesFirst,
  insideFrame,
  itemLabel,
  toBoardEdge,
  toBoardNode,
  toFlowEdge,
  toFlowNode,
  withCardView,
  type BoardFlowEdge,
  type BoardFlowNode,
} from './flow'
import { FrameNode } from './nodes/FrameNode'
import { ImageNode } from './nodes/ImageNode'
import { NoteNode } from './nodes/NoteNode'
import { TextNode } from './nodes/TextNode'

/** Height of the page header that floats over the canvas (App.tsx, h-12) */
const HEADER_HEIGHT = 48

const nodeTypes = { note: NoteNode, text: TextNode, image: ImageNode, frame: FrameNode }
const edgeTypes = { arrow: ArrowEdge }
const NO_NOTES = new Map<string, Note>()

/** The board canvas. Loaded lazily, so React Flow is its own chunk. */
export default function BoardPage({ board }: { board: Board }) {
  return (
    <ReactFlowProvider>
      <Canvas board={board} />
    </ReactFlowProvider>
  )
}

/*
 * State model (see the spike findings in the plan):
 *  - The database is the source of truth; React Flow runs controlled with a local copy of the nodes.
 *  - Every save is computed from an explicit next state (never from a ref that may lag a render).
 *  - Changes arriving from the database are applied only while nothing is being dragged, resized or
 *    typed; if one arrives in between, it is applied as soon as the interaction ends.
 */
function Canvas({ board }: { board: Board }) {
  const { resolvedTheme } = useTheme()
  const [nodes, setNodes] = useState<BoardFlowNode[]>(() => board.nodes.map(toFlowNode))
  const [edges, setEdges] = useState<BoardFlowEdge[]>(() => (board.edges ?? []).map(toFlowEdge))
  const [interacting, setInteracting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [seededAt, setSeededAt] = useState(board.updatedAt)

  // Database → canvas, keeping the selection. (Render-time update: the documented way to derive state from props.)
  if (seededAt !== board.updatedAt && !interacting && editingId === null) {
    setSeededAt(board.updatedAt)
    setNodes((prev) =>
      board.nodes.map((n) => ({ ...toFlowNode(n), selected: prev.find((p) => p.id === n.id)?.selected })),
    )
    setEdges((prev) =>
      (board.edges ?? []).map((e) => ({ ...toFlowEdge(e), selected: prev.find((p) => p.id === e.id)?.selected })),
    )
  }

  const rf = useReactFlow()
  const container = useRef<HTMLDivElement | null>(null)
  // The canvas is a drop target for notes dragged from the sidebar (see AppDnd)
  const { setNodeRef: setDropRef, isOver, active: dragged } = useDroppable({
    id: 'canvas',
    data: { type: 'canvas' } satisfies DndData,
  })
  const noteOver = isOver && dragged?.data.current?.type === 'note'
  const [filesOver, setFilesOver] = useState(false)
  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  useEffect(() => {
    nodesRef.current = nodes
    edgesRef.current = edges
  }, [nodes, edges])

  /**
   * Shows the new state at once and saves it; the interaction ends when the save is done. Arrows whose
   * items are gone are dropped here, whichever way the items were removed.
   */
  const commit = useCallback(
    async (next: BoardFlowNode[], { edges: nextEdges = edgesRef.current, ...extra }: { noteView?: NoteCardView; edges?: BoardFlowEdge[] } = {}) => {
      const ids = new Set(next.map((n) => n.id))
      const kept = nextEdges.filter((e) => ids.has(e.source) && ids.has(e.target))
      // Synchronously, so a second change before the next render builds on this one
      nodesRef.current = next
      edgesRef.current = kept
      setNodes(next)
      setEdges(kept)
      try {
        await updateBoard(board.id, { nodes: next.map(toBoardNode), edges: kept.map(toBoardEdge), ...extra })
      } finally {
        setInteracting(false)
      }
    },
    [board.id],
  )

  const removeNodes = useCallback(
    (ids: string[]) => void commit(nodesRef.current.filter((n) => !ids.includes(n.id))),
    [commit],
  )

  const resizeEnd = useCallback(
    (id: string, box: Box) =>
      void commit(
        nodesRef.current.map((n) =>
          n.id === id ? { ...n, position: { x: box.x, y: box.y }, width: box.width, height: box.height } : n,
        ),
      ),
    [commit],
  )

  const noteView = board.noteView ?? 'full'

  const setCardView = useCallback(
    (id: string, view: NoteCardView) =>
      void commit(nodesRef.current.map((n) => (n.id === id ? withCardView(n, view) : n))),
    [commit],
  )

  /** The toolbar: every note card switches, and new cards start in this view */
  const setAllCardViews = useCallback(
    (view: NoteCardView) => void commit(nodesRef.current.map((n) => withCardView(n, view)), { noteView: view }),
    [commit],
  )

  const withData = (n: BoardFlowNode, patch: Partial<Extract<BoardNode, { type: 'text' }>>): BoardFlowNode => ({
    ...n,
    data: { ...n.data, ...patch } as BoardNode,
  })

  const growText = useCallback((id: string, textarea: HTMLTextAreaElement) => {
    // Measure what the text needs (auto height), and only ever grow the box while typing
    textarea.style.height = 'auto'
    const needed = Math.ceil(textarea.scrollHeight) + 16
    textarea.style.height = ''
    setNodes((ns) => ns.map((n) => (n.id === id && (n.height ?? 0) < needed ? { ...n, height: needed } : n)))
  }, [])

  const commitText = useCallback(
    (id: string, text: string) => {
      setEditingId(null)
      void commit(
        text.trim() === ''
          ? nodesRef.current.filter((n) => n.id !== id) // an empty annotation is removed
          : nodesRef.current.map((n) => (n.id === id ? withData(n, { text }) : n)),
      )
    },
    [commit],
  )

  const setTextSize = useCallback(
    (id: string, size: 's' | 'm' | 'l') =>
      void commit(nodesRef.current.map((n) => (n.id === id ? withData(n, { size }) : n))),
    [commit],
  )

  const renameFrame = useCallback(
    (id: string, title: string) => {
      setEditingId(null)
      void commit(
        nodesRef.current.map((n) =>
          n.id === id && n.data.type === 'frame' ? { ...n, data: { ...n.data, title: title.trim() } } : n,
        ),
      )
    },
    [commit],
  )

  // ---- arrows ----------------------------------------------------------------------------

  const commitEdges = useCallback(
    (next: BoardFlowEdge[]) => void commit(nodesRef.current, { edges: next }),
    [commit],
  )

  /** A new arrow (selected), unless the same one exists already */
  const connect = useCallback(
    (source: string, target: string) => {
      if (source === target) return
      if (edgesRef.current.some((e) => e.source === source && e.target === target)) return
      commitEdges([
        ...edgesRef.current.map((e) => (e.selected ? { ...e, selected: false } : e)),
        { ...toFlowEdge({ id: nanoid(), source, target }), selected: true },
      ])
    },
    [commitEdges],
  )

  const setEdgeLabel = useCallback(
    (id: string, label: string) => {
      setEditingId(null)
      commitEdges(edgesRef.current.map((e) => (e.id === id ? { ...e, data: { label: label.trim() || undefined } } : e)))
    },
    [commitEdges],
  )

  const reverseEdge = useCallback(
    (id: string) =>
      commitEdges(edgesRef.current.map((e) => (e.id === id ? { ...e, source: e.target, target: e.source } : e))),
    [commitEdges],
  )

  const removeEdges = useCallback(
    (ids: string[]) => commitEdges(edgesRef.current.filter((e) => !ids.includes(e.id))),
    [commitEdges],
  )

  // "Connect to…": the item the picker draws an arrow from
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null)

  // ---- frames carry what lies on them ----------------------------------------------------

  /** Set when a drag starts with frames in it: those frames' start positions and the items inside them */
  const carried = useRef<{ frames: Map<string, XYPosition>; items: Map<string, { frame: string; start: XYPosition }> } | null>(
    null,
  )

  const startDrag = useCallback((dragged: BoardFlowNode[]) => {
    setInteracting(true)
    const frames = dragged.filter((n) => n.data.type === 'frame')
    carried.current = null
    if (!frames.length) return
    const draggedIds = new Set(dragged.map((n) => n.id))
    const items = new Map<string, { frame: string; start: XYPosition }>()
    for (const frame of frames) {
      for (const n of insideFrame(frame, nodesRef.current)) {
        if (!draggedIds.has(n.id) && !items.has(n.id)) items.set(n.id, { frame: frame.id, start: n.position })
      }
    }
    carried.current = { frames: new Map(frames.map((f) => [f.id, f.position])), items }
  }, [])

  /** Where the carried items are now, given where the dragged frames are */
  const carriedPositions = useCallback((dragged: BoardFlowNode[]) => {
    const c = carried.current
    if (!c?.items.size) return new Map<string, XYPosition>()
    const now = new Map(dragged.map((n) => [n.id, n.position]))
    return new Map(
      [...c.items].map(([id, { frame, start }]) => {
        const from = c.frames.get(frame)!
        const to = now.get(frame) ?? from
        return [id, { x: start.x + to.x - from.x, y: start.y + to.y - from.y }] as const
      }),
    )
  }, [])

  const drag = useCallback(
    (dragged: BoardFlowNode[]) => {
      const positions = carriedPositions(dragged)
      if (positions.size) setNodes((ns) => ns.map((n) => (positions.has(n.id) ? { ...n, position: positions.get(n.id)! } : n)))
    },
    [carriedPositions],
  )

  const stopDrag = useCallback(
    (dragged: BoardFlowNode[]) => {
      const positions = carriedPositions(dragged)
      carried.current = null
      for (const n of dragged) positions.set(n.id, n.position)
      void commit(nodesRef.current.map((n) => (positions.has(n.id) ? { ...n, position: positions.get(n.id)! } : n)))
    },
    [carriedPositions, commit],
  )

  // ---- adding items ----------------------------------------------------------------------

  const viewportCenter = useCallback((): XYPosition => {
    // The visible middle: the part of the canvas below the header that floats over it
    const r = container.current!.getBoundingClientRect()
    return rf.screenToFlowPosition({ x: r.left + r.width / 2, y: r.top + HEADER_HEIGHT + (r.height - HEADER_HEIGHT) / 2 })
  }, [rf])

  /** Top-left for a new item, centered on `at` (default: the middle of the view) and nudged so it never lands exactly on another item. */
  const place = useCallback(
    (size: { width: number; height: number }, at?: XYPosition) => {
      const center = at ?? viewportCenter()
      let x = center.x - size.width / 2
      let y = center.y - size.height / 2
      while (nodesRef.current.some((n) => Math.abs(n.position.x - x) < 12 && Math.abs(n.position.y - y) < 12)) {
        x += 24
        y += 24
      }
      return { x, y }
    },
    [viewportCenter],
  )

  /** Adds an item, selects it (and only it). Text items are not saved until they have text. */
  const addNode = useCallback(
    (node: BoardNode, { persist = true } = {}) => {
      const next = framesFirst([
        ...nodesRef.current.map((n) => (n.selected ? { ...n, selected: false } : n)),
        { ...toFlowNode(node), selected: true },
      ])
      if (persist) void commit(next)
      else {
        nodesRef.current = next
        setNodes(next)
      }
    },
    [commit],
  )

  /** Selects an item (only it) and zooms to it, also when it is far outside the view. */
  const focusNode = useCallback(
    (id: string) => {
      setNodes((ns) => ns.map((n) => ({ ...n, selected: n.id === id })))
      void rf.fitView({ nodes: [{ id }], duration: 300, padding: 0.4, maxZoom: 1 })
    },
    [rf],
  )

  const addNote = useCallback(
    (noteId: string, at?: XYPosition) => {
      const existing = nodesRef.current.find((n) => n.data.type === 'note' && n.data.noteId === noteId)
      if (existing) {
        // One card per note per board: show the one that is already there
        focusNode(existing.id)
        return
      }
      const collapsed = noteView === 'title'
      const size = { width: 300, height: collapsed ? TITLE_HEIGHT : DEFAULT_CARD_HEIGHT }
      addNode({
        id: nanoid(),
        type: 'note',
        noteId,
        ...(noteView === 'full' ? {} : { view: noteView }),
        ...(collapsed ? { restoreHeight: DEFAULT_CARD_HEIGHT } : {}),
        ...place(size, at),
        ...size,
      })
    },
    [addNode, place, focusNode, noteView],
  )

  const addText = useCallback(
    (at?: XYPosition) => {
      const size = { width: 240, height: 48 }
      const id = nanoid()
      addNode({ id, type: 'text', text: '', size: 'm', ...place(size, at), ...size }, { persist: false })
      setEditingId(id)
    },
    [addNode, place],
  )

  const addImages = useCallback(
    async (files: File[], at?: XYPosition) => {
      for (const file of files) {
        try {
          const asset = await addImageAsset(file)
          // Show at most 320 px on the long side (and at least 96, so tiny icons can still be grabbed)
          const side = Math.max(asset.width, asset.height)
          const scale = Math.min(Math.max(side, 96), 320) / side
          const size = { width: Math.round(asset.width * scale), height: Math.round(asset.height * scale) }
          addNode({ id: nanoid(), type: 'image', assetId: asset.id, ...place(size, at), ...size })
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Could not add the image.')
        }
      }
    },
    [addNode, place],
  )

  /** A frame around the selected items, or an empty one in the middle of the view; its name is edited right away */
  const addFrame = useCallback(() => {
    const selected = nodesRef.current.filter((n) => n.selected)
    let box = { width: 560, height: 360, ...place({ width: 560, height: 360 }) }
    if (selected.length) {
      const PAD = 32
      const left = Math.min(...selected.map((n) => n.position.x))
      const top = Math.min(...selected.map((n) => n.position.y))
      const right = Math.max(...selected.map((n) => n.position.x + (n.width ?? n.measured?.width ?? n.data.width)))
      const bottom = Math.max(...selected.map((n) => n.position.y + (n.height ?? n.measured?.height ?? n.data.height)))
      // Extra room at the top for the frame's name
      box = { x: left - PAD, y: top - PAD - 40, width: right - left + 2 * PAD, height: bottom - top + 2 * PAD + 40 }
    }
    const id = nanoid()
    addNode({ id, type: 'frame', title: '', ...box })
    setEditingId(id)
  }, [addNode, place])

  useRegisterCanvasDrop(({ noteId, x, y }) => addNote(noteId, rf.screenToFlowPosition({ x, y })))

  // Paste images with Ctrl+V (unless the user is typing somewhere)
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest('input, textarea, [contenteditable="true"]')) return
      const files = [...(e.clipboardData?.files ?? [])].filter(isImageFile)
      if (!files.length) return
      e.preventDefault()
      void addImages(files)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [addImages])

  // Referenced notes: one query for the whole board, so a rename or edit anywhere updates every card
  const idsKey = useMemo(
    () => [...new Set(nodes.flatMap((n) => (n.data.type === 'note' ? [n.data.noteId] : [])))].sort().join(','),
    [nodes],
  )
  const notes = useLiveQuery(
    async () => {
      const found = await db.notes.bulkGet(idsKey ? idsKey.split(',') : [])
      return new Map(found.flatMap((n) => (n ? [[n.id, n] as const] : [])))
    },
    [idsKey],
    NO_NOTES,
  )

  const noteIdsOnBoard = useMemo(() => new Set(idsKey ? idsKey.split(',') : []), [idsKey])

  // Only one editor is live at a time; opening one from a very zoomed-out view zooms in so it is readable
  const editNote = useCallback(
    (id: string) => {
      let node = nodesRef.current.find((n) => n.id === id)
      // The editor needs room: a collapsed card opens up first
      if (node?.data.type === 'note' && node.data.view === 'title') {
        node = withCardView(node, 'full')
        void commit(nodesRef.current.map((n) => (n.id === id ? node! : n)))
      }
      setEditingId(id)
      if (node && rf.getZoom() < 0.75) {
        void rf.setCenter(node.position.x + (node.width ?? 300) / 2, node.position.y + (node.height ?? 200) / 2, {
          zoom: 1,
          duration: 200,
        })
      }
    },
    [rf, commit],
  )

  const context = useMemo(
    () => ({
      notes,
      editingId,
      setEditingId,
      editNote,
      removeNodes,
      setCardView,
      resizeEnd,
      growText,
      commitText,
      setTextSize,
      renameFrame,
      connectFrom: setConnectingFrom,
      setEdgeLabel,
      reverseEdge,
      removeEdges,
      beginInteraction: () => setInteracting(true),
    }),
    [notes, editingId, editNote, removeNodes, setCardView, resizeEnd, growText, commitText, setTextSize, renameFrame, setEdgeLabel, reverseEdge, removeEdges],
  )

  const [minimap, setMinimap] = useMinimapSetting()

  // Arrows are named after what they connect, for screen readers
  const labelledEdges = useMemo(() => {
    const byId = new Map(nodes.map((n) => [n.id, n]))
    const name = (id: string) => {
      const n = byId.get(id)
      return n ? itemLabel(n.data, notes) : ''
    }
    return edges.map((e) => ({ ...e, ariaLabel: `Arrow from ${name(e.source)} to ${name(e.target)}${e.data?.label ? ` (${e.data.label})` : ''}` }))
  }, [edges, nodes, notes])

  return (
    <BoardContext.Provider value={context}>
      <div
        ref={(el) => {
          container.current = el
          setDropRef(el)
        }}
        data-testid="board-page"
        data-board-id={board.id}
        className={cn('relative h-full w-full', (filesOver || noteOver) && 'ring-2 ring-ring/60 ring-inset')}
        // Images dragged in from the desktop (notes dragged from the sidebar are handled separately)
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes('Files')) {
            e.preventDefault()
            setFilesOver(true)
          }
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFilesOver(false)
        }}
        onDrop={(e) => {
          setFilesOver(false)
          const files = [...e.dataTransfer.files].filter(isImageFile)
          if (!files.length) return
          e.preventDefault()
          void addImages(files, rf.screenToFlowPosition({ x: e.clientX, y: e.clientY }))
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={labelledEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={(changes: NodeChange<BoardFlowNode>[]) => setNodes((ns) => applyNodeChanges(changes, ns))}
          onEdgesChange={(changes: EdgeChange<BoardFlowEdge>[]) => setEdges((es) => applyEdgeChanges(changes, es))}
          onNodeDragStart={(_, __, dragged) => startDrag(dragged)}
          onNodeDrag={(_, __, dragged) => drag(dragged)}
          onNodeDragStop={(_, __, dragged) => stopDrag(dragged)}
          onSelectionDragStart={(_, dragged) => startDrag(dragged)}
          onSelectionDrag={(_, dragged) => drag(dragged)}
          onSelectionDragStop={(_, dragged) => stopDrag(dragged)}
          onConnect={(c: Connection) => connect(c.source, c.target)}
          isValidConnection={(c) => c.source !== c.target}
          // React Flow has already applied the removal locally; save what remains in one go (items and arrows)
          onDelete={({ nodes: gone, edges: goneEdges }) => {
            const nodeIds = new Set(gone.map((n) => n.id))
            const edgeIds = new Set(goneEdges.map((e) => e.id))
            void commit(nodesRef.current.filter((n) => !nodeIds.has(n.id)), {
              edges: edgesRef.current.filter((e) => !edgeIds.has(e.id)),
            })
          }}
          onEdgeDoubleClick={(_, edge) => setEditingId(edge.id)}
          // Clicking anywhere else ends in-place editing (a click inside the edited card does not)
          onPaneClick={() => setEditingId(null)}
          onNodeClick={(_, node) => editingId && node.id !== editingId && setEditingId(null)}
          deleteKeyCode={['Backspace', 'Delete']}
          // The canvas runs behind the page header; saved viewports stay relative to the area below it
          onMoveEnd={(_, viewport) => void updateBoard(board.id, { viewport: { ...viewport, y: viewport.y - HEADER_HEIGHT } })}
          defaultViewport={{ ...board.viewport, y: board.viewport.y + HEADER_HEIGHT }}
          minZoom={0.1}
          maxZoom={2}
          zoomOnDoubleClick={false}
          onlyRenderVisibleElements
          colorMode={resolvedTheme === 'dark' ? 'dark' : 'light'}
          // In the corner below the + button, not under the zoom bar where it looked like a stray label
          attributionPosition="bottom-right"
        >
          <Background gap={20} size={1} />
          <ZoomSlider minimap={minimap} onMinimapChange={setMinimap} />
          {minimap && nodes.length > 0 && (
            <MiniMap
              position="bottom-left"
              className="!mb-16 overflow-hidden rounded-lg border shadow-sm"
              ariaLabel="Minimap"
              pannable
              zoomable
              bgColor="var(--background)"
              maskColor="color-mix(in oklab, var(--muted) 70%, transparent)"
              nodeColor={(n) => (n.type === 'frame' ? 'var(--muted)' : 'var(--muted-foreground)')}
              nodeBorderRadius={4}
            />
          )}
          {nodes.length > 0 && <NodeSearch nodes={nodes} notes={notes} onFind={focusNode} />}
          <Panel position="top-right">
            <CardViewMenu value={noteView} onChange={setAllCardViews} />
          </Panel>
        </ReactFlow>
        <BoardFab
          empty={nodes.length === 0}
          excludeNoteIds={noteIdsOnBoard}
          onPickNote={(noteId) => addNote(noteId)}
          onAddText={() => addText()}
          onAddImages={(files) => void addImages(files)}
          onAddFrame={addFrame}
        />
        <ConnectPicker
          from={nodes.find((n) => n.id === connectingFrom) ?? null}
          nodes={nodes}
          notes={notes}
          onClose={() => setConnectingFrom(null)}
          onPick={(target) => connectingFrom && connect(connectingFrom, target)}
        />
      </div>
    </BoardContext.Provider>
  )
}

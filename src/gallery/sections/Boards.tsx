import '@xyflow/react/dist/style.css'
import { Background, ReactFlow, ReactFlowProvider, useEdgesState, useNodesState, type Node } from '@xyflow/react'
import { useTheme } from 'next-themes'
import { useMemo, useState } from 'react'
import { ArrowEdge } from '@/components/board/ArrowEdge'
import { BoardContext, type BoardContextValue } from '@/components/board/board-context'
import { toFlowEdge, toFlowNode, withCardView, type BoardFlowEdge, type BoardFlowNode } from '@/components/board/flow'
import { FrameNode } from '@/components/board/nodes/FrameNode'
import { ImageNode } from '@/components/board/nodes/ImageNode'
import { NoteNode } from '@/components/board/nodes/NoteNode'
import { TextNode } from '@/components/board/nodes/TextNode'
import { ZoomSlider } from '@/components/board/ZoomSlider'
import type { BoardNode } from '@/db/schema'
import { GalleryEditor } from '../GalleryEditor'
import { BOARD, SYNC, TRIP } from '../samples'
import { Example, Section } from '../Example'

const nodeTypes = { note: NoteNode, text: TextNode, image: ImageNode, frame: FrameNode }
const edgeTypes = { arrow: ArrowEdge }
const notes = new Map([TRIP, SYNC].map((n) => [n.id, n]))
const nothing = () => undefined

export function Boards() {
  return (
    <Section
      id="boards"
      title="Boards"
      intro="The app's board items on a canvas: a frame, note cards, a text, a plain picture and a Polaroid, with arrows. Drag, resize, zoom, select an item for its toolbar, double-click a text to edit it. Nothing is saved."
    >
      <Example title="A board" source="components/board/nodes/, components/board/ArrowEdge.tsx" plain>
        <div className="relative h-[40rem] overflow-hidden rounded-xl border max-sm:h-[32rem]">
          <ReactFlowProvider>
            <Canvas />
          </ReactFlowProvider>
        </div>
      </Example>
    </Section>
  )
}

/** The canvas, with the board context the items expect; what they change stays here in memory */
function Canvas() {
  const { resolvedTheme } = useTheme()
  const [nodes, setNodes, onNodesChange] = useNodesState<BoardFlowNode>(BOARD.nodes.map(toFlowNode))
  const [edges, setEdges, onEdgesChange] = useEdgesState<BoardFlowEdge>((BOARD.edges ?? []).map(toFlowEdge))
  const [editingId, setEditingId] = useState<string | null>(null)

  const context = useMemo<BoardContextValue>(() => {
    /** Changes one item's data (a card's view, a text, a caption…), here only */
    const patch = (id: string, change: (data: BoardNode) => BoardNode) =>
      setNodes((ns) => ns.map((n) => (n.id === id ? ({ ...n, data: change(n.data) } as Node<BoardNode>) : n)))
    const done = () => setEditingId(null)
    return {
      notes,
      editingId,
      setEditingId,
      editNote: setEditingId,
      renderEditor: (note) => <GalleryEditor content={note.content} compact />,
      removeNodes: (ids) => setNodes((ns) => ns.filter((n) => !ids.includes(n.id))),
      setCardView: (id, view) => setNodes((ns) => ns.map((n) => (n.id === id ? withCardView(n, view) : n))),
      resizeEnd: nothing,
      growText: nothing,
      commitText: (id, text) => {
        patch(id, (d) => ({ ...d, text }) as BoardNode)
        done()
      },
      setTextSize: (id, size) => patch(id, (d) => ({ ...d, size }) as BoardNode),
      renameFrame: (id, title) => {
        patch(id, (d) => ({ ...d, title }) as BoardNode)
        done()
      },
      setImageStyle: (id, style) => patch(id, (d) => ({ ...d, style }) as BoardNode),
      setImageCaption: (id, alt) => {
        patch(id, (d) => ({ ...d, alt }) as BoardNode)
        done()
      },
      connectFrom: nothing,
      setEdgeLabel: (id, label) => {
        setEdges((es) => es.map((e) => (e.id === id ? { ...e, data: { label: label.trim() || undefined } } : e)))
        done()
      },
      reverseEdge: (id) => setEdges((es) => es.map((e) => (e.id === id ? { ...e, source: e.target, target: e.source } : e))),
      removeEdges: (ids) => setEdges((es) => es.filter((e) => !ids.includes(e.id))),
      beginInteraction: nothing,
    }
  }, [editingId, setNodes, setEdges])

  return (
    <BoardContext.Provider value={context}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onEdgeDoubleClick={(_, edge) => setEditingId(edge.id)}
        onPaneClick={() => setEditingId(null)}
        defaultViewport={BOARD.viewport}
        minZoom={0.1}
        maxZoom={2}
        zoomOnDoubleClick={false}
        // The page scrolls past the board; the wheel zooms only once the board is clicked
        preventScrolling={false}
        colorMode={resolvedTheme === 'dark' ? 'dark' : 'light'}
        attributionPosition="bottom-right"
      >
        <Background gap={20} size={1} />
        <ZoomSlider minimap={false} onMinimapChange={nothing} />
      </ReactFlow>
    </BoardContext.Provider>
  )
}

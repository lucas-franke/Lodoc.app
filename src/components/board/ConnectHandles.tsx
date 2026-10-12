import { Handle, Position, useConnection } from '@xyflow/react'

const SIDES = [Position.Top, Position.Right, Position.Bottom, Position.Left]

/**
 * Drawing arrows: a dot on each side (shown on hover or when the item is selected) to drag from, and, while
 * an arrow is being drawn, the whole item as the place to drop it. Arrows attach to the nearest edge on
 * their own (ArrowEdge), so which dot or where on the item doesn't matter.
 */
export function ConnectHandles() {
  const connecting = useConnection((c) => c.inProgress)
  return (
    <>
      {SIDES.map((side) => (
        <Handle key={side} id={side} type="source" position={side} isConnectableEnd={false} className="board-connect" />
      ))}
      <Handle
        id="drop"
        type="target"
        position={Position.Top}
        isConnectableStart={false}
        className="board-drop"
        style={{ pointerEvents: connecting ? 'all' : 'none' }}
      />
    </>
  )
}

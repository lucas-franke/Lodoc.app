import { useEffect } from 'react'

/** A swipe from this close to the left edge opens the sidebar */
const EDGE = 20
/** How far the finger has to travel sideways */
const DISTANCE = 60
/** A finger resting this long first is a long press (dragging a row, a context menu), not a swipe */
const LONG_PRESS = 250

/**
 * Phones: swipe left on the open sidebar (or the dimmed page beside it) to close it, and swipe right from
 * the left edge to open it. Opening is left out where sideways swipes already mean something (boards pan),
 * and where the system uses the edge for "back" the browser simply doesn't pass the swipe on; the menu
 * button keeps working either way. Only clearly sideways swipes count, so scrolling is unaffected.
 */
export function useSidebarSwipe({
  open,
  setOpen,
  canOpen,
  enabled,
}: {
  open: boolean
  setOpen: (open: boolean) => void
  /** Whether an edge swipe may open it on the current page */
  canOpen: boolean
  /** Narrow screens only: on wide ones the sidebar isn't an overlay */
  enabled: () => boolean
}) {
  useEffect(() => {
    let start: { x: number; y: number; at: number; moved: boolean; action: 'open' | 'close' } | null = null

    const onStart = (e: TouchEvent) => {
      start = null
      if (e.touches.length !== 1 || !enabled()) return
      const { clientX: x, clientY: y } = e.touches[0]
      const target = e.target instanceof Element ? e.target : null
      if (open && target?.closest('[data-sidebar-panel], [data-sidebar-backdrop]')) start = { x, y, at: Date.now(), moved: false, action: 'close' }
      else if (!open && canOpen && x <= EDGE) start = { x, y, at: Date.now(), moved: false, action: 'open' }
    }

    const onMove = (e: TouchEvent) => {
      if (!start) return
      const dx = e.touches[0].clientX - start.x
      const dy = e.touches[0].clientY - start.y
      if (!start.moved && Math.hypot(dx, dy) > 8) {
        start.moved = true
        if (Date.now() - start.at > LONG_PRESS) return void (start = null)
      }
      // Mostly vertical: a scroll
      if (Math.abs(dy) > Math.abs(dx) * 0.5 && Math.abs(dy) > 12) return void (start = null)
      if (start.action === 'close' && dx < -DISTANCE) {
        start = null
        setOpen(false)
      } else if (start.action === 'open' && dx > DISTANCE) {
        start = null
        setOpen(true)
      }
    }

    const onEnd = () => (start = null)

    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onEnd)
    window.addEventListener('touchcancel', onEnd)
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
      window.removeEventListener('touchcancel', onEnd)
    }
  }, [open, setOpen, canOpen, enabled])
}

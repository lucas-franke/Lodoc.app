import type { FloatingUIOptions } from '@blocknote/react'
import { autoPlacement, offset, shift, size } from '@floating-ui/react'

// The "/", "@" and "#" menus while the format bar is shown (touch screens)

/** The room kept free at the bottom of the screen: the format bar (MobileFormatBar), and a small gap */
function bottomRoom() {
  const bar = document.querySelector('.note-format-bar')
  return 10 + (bar ? bar.getBoundingClientRect().height : 0)
}

/**
 * Placed like BlockNote places them (below the cursor, or above it when there is more room there, scrolling within
 * that room), except that the format bar counts as taken: the list ends above it instead of running under it.
 */
export const ABOVE_FORMAT_BAR: FloatingUIOptions = {
  useFloatingOptions: {
    middleware: [
      offset(10),
      autoPlacement(() => ({ allowedPlacements: ['bottom-start', 'top-start'], padding: { top: 10, bottom: bottomRoom() } })),
      shift(),
      size(() => ({
        padding: { top: 10, bottom: bottomRoom() },
        apply({ elements, availableHeight }) {
          elements.floating.style.maxHeight = `${Math.max(0, availableHeight)}px`
        },
      })),
    ],
  },
}

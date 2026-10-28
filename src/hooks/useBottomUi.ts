import { useEffect } from 'react'

/**
 * Marks what is fixed to the bottom of the screen while it is shown (the phone format bar, a board's controls),
 * so notifications are lifted above it (index.css sets --toast-lift for each, Notifications adds it).
 */
export function useBottomUi(kind: 'format-bar' | 'board') {
  useEffect(() => {
    const root = document.documentElement
    root.dataset.bottomUi = kind
    return () => {
      if (root.dataset.bottomUi === kind) delete root.dataset.bottomUi
    }
  }, [kind])
}

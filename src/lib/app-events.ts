import { useEffect } from 'react'

// A few app-wide requests that the command palette (or a shortcut) makes of components elsewhere,
// e.g. "open the Appearance panel" for the button in the sidebar footer.

type AppEvent = 'open-appearance' | 'open-palette' | 'open-shortcuts' | 'backup-exported'

const target = new EventTarget()

export function emitAppEvent(event: AppEvent) {
  target.dispatchEvent(new Event(event))
}

export function useAppEvent(event: AppEvent, handler: () => void) {
  useEffect(() => {
    target.addEventListener(event, handler)
    return () => target.removeEventListener(event, handler)
  }, [event, handler])
}

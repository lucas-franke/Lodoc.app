import { useEffect } from 'react'

// A few app-wide requests that the command palette (or a shortcut) makes of components elsewhere,
// e.g. "open the shortcut list". An event can carry a detail.

type AppEvent =
  | 'open-palette'
  | 'open-shortcuts'
  | 'backup-exported'
  | 'tidy-board'
  | 'import-markdown-files'
  | 'import-markdown-folder'

const target = new EventTarget()

export function emitAppEvent(event: AppEvent, detail?: unknown) {
  target.dispatchEvent(new CustomEvent(event, { detail }))
}

export function useAppEvent(event: AppEvent, handler: (detail?: unknown) => void) {
  useEffect(() => {
    const listener = (e: Event) => handler((e as CustomEvent).detail)
    target.addEventListener(event, listener)
    return () => target.removeEventListener(event, listener)
  }, [event, handler])
}

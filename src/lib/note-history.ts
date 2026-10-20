import { useSyncExternalStore } from 'react'

// Which note's history dialog is open (null: none). Any menu can open it; App shows the dialog.

let openFor: string | null = null
const listeners = new Set<() => void>()

export function openNoteHistory(noteId: string | null) {
  openFor = noteId
  listeners.forEach((l) => l())
}

export function useNoteHistoryOpen() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => openFor,
  )
}

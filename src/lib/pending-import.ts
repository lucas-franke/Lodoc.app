import { useSyncExternalStore } from 'react'
import type { ProjectFile } from './project-file'

// A backup that arrived from outside (shared to the app from another device) and waits for the import dialog,
// which App shows: Merge or Replace, as when the file is picked in the Backup menu.

let pending: ProjectFile | null = null
const listeners = new Set<() => void>()

export function setPendingImport(project: ProjectFile | null) {
  pending = project
  listeners.forEach((l) => l())
}

export function usePendingImport() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => pending,
  )
}

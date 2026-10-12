import { useSyncExternalStore } from 'react'

/** The current view lives in the URL hash (#/note/<id>, #/folder/<id> or #/board/<id>) so reloads stay put. */
export type RouteType = 'note' | 'folder' | 'board'
export type Route = { type: RouteType; id: string } | null

function subscribe(callback: () => void) {
  window.addEventListener('hashchange', callback)
  return () => window.removeEventListener('hashchange', callback)
}

// useSyncExternalStore needs a stable snapshot, so cache by hash string
let cachedHash: string | null = null
let cachedRoute: Route = null

function getRoute(): Route {
  const hash = window.location.hash
  if (hash !== cachedHash) {
    cachedHash = hash
    const match = /^#\/(note|folder|board)\/(.+)$/.exec(hash)
    cachedRoute = match ? { type: match[1] as RouteType, id: decodeURIComponent(match[2]) } : null
  }
  return cachedRoute
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, getRoute)
}

const TRASH_HASH = '#/trash'
const isTrashHash = () => window.location.hash === TRASH_HASH

/** True on the trash page (#/trash). */
export function useIsTrash(): boolean {
  return useSyncExternalStore(subscribe, isTrashHash)
}

/** The tag whose notes are shown (#/tag/<name>), or null */
const tagOfHash = () => {
  const m = /^#\/tag\/(.+)$/.exec(window.location.hash)
  return m ? decodeURIComponent(m[1]) : null
}
export function useTagRoute(): string | null {
  return useSyncExternalStore(subscribe, tagOfHash)
}

/** True on the overview (no page open). */
export function useIsHome(): boolean {
  const route = useRoute()
  const trash = useIsTrash()
  const tag = useTagRoute()
  return route === null && !trash && tag === null
}

export function useActiveNoteId(): string | null {
  const route = useRoute()
  return route?.type === 'note' ? route.id : null
}

export function useActiveFolderId(): string | null {
  const route = useRoute()
  return route?.type === 'folder' ? route.id : null
}

export function useActiveBoardId(): string | null {
  const route = useRoute()
  return route?.type === 'board' ? route.id : null
}

export function openNote(id: string | null) {
  window.location.hash = id ? `#/note/${encodeURIComponent(id)}` : ''
}

export function openFolder(id: string) {
  window.location.hash = `#/folder/${encodeURIComponent(id)}`
}

export function openTag(tag: string) {
  window.location.hash = '#/tag/' + encodeURIComponent(tag)
}

export function openTrash() {
  window.location.hash = TRASH_HASH
}

export function openBoard(id: string) {
  window.location.hash = `#/board/${encodeURIComponent(id)}`
}

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

/** The filters of the Activity page; "deleted" is what used to be the Trash page */
export type ActivityTab = 'all' | 'changes' | 'messages' | 'deleted'

/** #/activity, #/activity/<tab>, and the old #/trash (bookmarks, history) for the deleted items */
const activityTabOfHash = (): ActivityTab | null => {
  const hash = window.location.hash
  if (hash === '#/trash') return 'deleted'
  const m = /^#\/activity(?:\/(changes|messages|deleted))?$/.exec(hash)
  return m ? ((m[1] as ActivityTab | undefined) ?? 'all') : null
}

/** The Activity tab shown, or null on other pages */
export function useActivityTab(): ActivityTab | null {
  return useSyncExternalStore(subscribe, activityTabOfHash)
}

export const activityHash = (tab: ActivityTab = 'all') => (tab === 'all' ? '#/activity' : `#/activity/${tab}`)

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
  const activity = useActivityTab()
  const tag = useTagRoute()
  return route === null && activity === null && tag === null
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

export function openActivity(tab: ActivityTab = 'all') {
  window.location.hash = activityHash(tab)
}

export function openBoard(id: string) {
  window.location.hash = `#/board/${encodeURIComponent(id)}`
}

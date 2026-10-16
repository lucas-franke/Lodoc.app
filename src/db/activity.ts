import Dexie from 'dexie'
import { nanoid } from 'nanoid'
import { useSyncExternalStore } from 'react'
import { db } from './db'
import type { ActivityEntry } from './schema'

// Activity: what changed (created, renamed, moved, …), what was deleted, and every message the app showed.
// Only structural changes are logged, never typing. Kept on this device, not in backups.

const KEEP_DAYS = 90
const KEEP_ENTRIES = 500
const DAY = 24 * 60 * 60 * 1000

/** A rename this soon after creating something is part of creating it (e.g. naming a new folder) */
export const SETTLING_TIME = 2 * 60 * 1000

export type ActivityItem = NonNullable<ActivityEntry['item']>

/**
 * Adds a line to Activity. Never awaited and never part of the caller's transaction (callers are often
 * inside one that doesn't include the log), so logging can't hold up or break the change itself.
 */
export function logActivity(entry: Omit<ActivityEntry, 'id' | 'at'>) {
  const row: ActivityEntry = { id: nanoid(), at: Date.now(), ...entry }
  void Dexie.ignoreTransaction(() => db.activity.add(row)).catch(() => {
    // the log is a convenience; losing a line is fine
  })
}

/** Changes made to the notes: "Created", "Renamed", … */
export const logChange = (text: string, item?: ActivityItem) => logActivity({ kind: 'change', text, item })

/** Moving into another folder (reordering within one isn't logged) */
export function logMove(item: ActivityItem, from: string | null | undefined, to: string | null) {
  if ((from ?? null) === to) return
  void Dexie.ignoreTransaction(async () => {
    const folder = to ? await db.folders.get(to) : undefined
    logChange(to ? `Moved to "${folder?.name ?? 'a folder'}"` : 'Moved to the top level', item)
  }).catch(() => {})
}

/** Renames are logged unless they belong to creating the item, like naming a new folder */
export function logRename(item: ActivityItem, before: string, createdAt: number) {
  if (before === item.title || Date.now() - createdAt < SETTLING_TIME) return
  logChange(`Renamed (was "${before}")`, item)
}

/** A new note that was discarded unused leaves no trace */
export function forgetItem(id: string) {
  void Dexie.ignoreTransaction(() => db.activity.where('item.id').equals(id).delete()).catch(() => {})
}

/** Drops lines older than KEEP_DAYS and beyond the newest KEEP_ENTRIES; called once on start. */
export async function purgeOldActivity(now = Date.now()) {
  await db.activity.where('at').below(now - KEEP_DAYS * DAY).delete()
  const extra = (await db.activity.count()) - KEEP_ENTRIES
  if (extra > 0) await db.activity.orderBy('at').limit(extra).delete()
}

// When Activity was last looked at: errors after that get a dot on the sidebar row
const SEEN_KEY = 'localnotes:activitySeen'
const listeners = new Set<() => void>()
let seen = (() => {
  try {
    return Number(localStorage.getItem(SEEN_KEY)) || 0
  } catch {
    return 0
  }
})()

export function markActivitySeen() {
  seen = Date.now()
  try {
    localStorage.setItem(SEEN_KEY, String(seen))
  } catch {
    // the dot just comes back next time
  }
  listeners.forEach((l) => l())
}

export function useActivitySeen() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => seen,
  )
}

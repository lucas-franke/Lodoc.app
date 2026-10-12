import { liveQuery } from 'dexie'
import { useSyncExternalStore } from 'react'
import { db } from '@/db/db'
import { emitAppEvent } from './app-events'
import { buildProjectBlob, setLastExport } from './project-file'

/*
 * Automatic backup into a folder the user picks (File System Access API: Chrome, Edge, Opera). The folder
 * handle is kept in its own small IndexedDB database, so it is never part of a backup itself. Whenever the
 * notes, folders or boards change, one file per day ("lodoc-auto-YYYY-MM-DD.json") is written a little later;
 * the newest KEEP files are kept, older automatic backups are removed (other files in the folder are never
 * touched). After a reload the browser usually asks again before writing: until the user allows it with a
 * click, the backup is "paused".
 */

/** Wait this long after a change before writing, so a burst of edits becomes one write */
const DELAY = 15_000
const KEEP = 7
const FILE = /^lodoc-auto-\d{4}-\d{2}-\d{2}\.json$/
const STATE_KEY = 'localnotes:autoBackup'

// The parts of the File System Access API used here (not in TypeScript's DOM types yet)
type Permission = 'granted' | 'denied' | 'prompt'
interface DirectoryHandle {
  name: string
  queryPermission(options: { mode: 'readwrite' }): Promise<Permission>
  requestPermission(options: { mode: 'readwrite' }): Promise<Permission>
  getFileHandle(name: string, options?: { create?: boolean }): Promise<{ createWritable(): Promise<WritableStream & { write(data: Blob): Promise<void>; close(): Promise<void> }> }>
  removeEntry(name: string): Promise<void>
  keys(): AsyncIterableIterator<string>
}
type PickerWindow = { showDirectoryPicker(options?: { id?: string; mode?: 'readwrite' }): Promise<DirectoryHandle> }

export const autoBackupSupported = typeof window !== 'undefined' && 'showDirectoryPicker' in window

export type AutoBackupState =
  | { status: 'off' }
  | { status: 'on' | 'paused'; folder: string; lastSaved: number | null; error?: string }

// ---- the folder handle, in its own database

function handleStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('lodoc-backup-folder', 1)
    open.onupgradeneeded = () => open.result.createObjectStore('handles')
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const request = run(open.result.transaction('handles', mode).objectStore('handles'))
      request.onsuccess = () => {
        open.result.close()
        resolve(request.result)
      }
      request.onerror = () => {
        open.result.close()
        reject(request.error)
      }
    }
  })
}
const loadHandle = () => handleStore<DirectoryHandle | undefined>('readonly', (s) => s.get('folder'))
const saveHandle = (handle: DirectoryHandle) => handleStore('readwrite', (s) => s.put(handle, 'folder'))
const clearHandle = () => handleStore('readwrite', (s) => s.delete('folder'))

// ---- state, for the Backup menu

let state: AutoBackupState = { status: 'off' }
let handle: DirectoryHandle | null = null
const listeners = new Set<() => void>()
function setState(next: AutoBackupState) {
  state = next
  for (const l of listeners) l()
}

export function useAutoBackup(): AutoBackupState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}

function readSaved(): { lastSaved: number | null; fingerprint: string | null } {
  try {
    const saved = JSON.parse(localStorage.getItem(STATE_KEY) ?? 'null') as { lastSaved?: number; fingerprint?: string } | null
    return { lastSaved: saved?.lastSaved ?? null, fingerprint: saved?.fingerprint ?? null }
  } catch {
    return { lastSaved: null, fingerprint: null }
  }
}
function writeSaved(lastSaved: number, fingerprint: string) {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify({ lastSaved, fingerprint }))
  } catch {
    // Then the next start just writes once more
  }
}

// ---- noticing changes

/** Changes whenever something that is backed up changes (but not when a board is only panned) */
async function fingerprint() {
  const [notes, lastNote, boards, folders] = await Promise.all([
    db.notes.count(),
    db.notes.orderBy('updatedAt').last(),
    db.boards.toArray(),
    db.folders.toArray(),
  ])
  return [
    notes,
    lastNote?.updatedAt ?? 0,
    boards.length,
    boards.map((b) => `${b.id}:${b.updatedAt}:${b.folderId ?? ''}`).join(','),
    folders.map((f) => `${f.id}:${f.name}:${f.parentId ?? ''}:${f.order}`).join(','),
  ].join('|')
}

let current: string | null = null
let timer: number | undefined
let watching: { unsubscribe(): void } | null = null

function watch() {
  if (watching) return
  watching = liveQuery(fingerprint).subscribe({
    next: (value) => {
      current = value
      if (state.status === 'on' && value !== readSaved().fingerprint && timer === undefined) {
        timer = window.setTimeout(() => {
          timer = undefined
          void backUpNow()
        }, DELAY)
      }
    },
  })
}

// ---- writing

const today = () => new Date().toISOString().slice(0, 10)

/** Writes today's backup file into the folder now (and removes automatic backups beyond the newest KEEP). */
export async function backUpNow() {
  if (!handle || state.status === 'off') return
  try {
    if ((await handle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
      setState({ ...state, status: 'paused' })
      return
    }
    const print = current ?? (await fingerprint())
    const file = await handle.getFileHandle(`lodoc-auto-${today()}.json`, { create: true })
    const writable = await file.createWritable()
    await writable.write(await buildProjectBlob())
    await writable.close()
    const names: string[] = []
    for await (const name of handle.keys()) if (FILE.test(name)) names.push(name)
    for (const old of names.sort().reverse().slice(KEEP)) await handle.removeEntry(old)
    const now = Date.now()
    writeSaved(now, print)
    setLastExport(now)
    emitAppEvent('backup-exported')
    setState({ status: 'on', folder: handle.name, lastSaved: now })
  } catch (error) {
    setState({
      status: 'on',
      folder: handle.name,
      lastSaved: readSaved().lastSaved,
      error: error instanceof Error ? error.message : 'Could not write the backup.',
    })
  }
}

/** On start: pick up where we were (paused if the browser wants to ask again first) */
export async function startAutoBackup() {
  if (!autoBackupSupported) return
  try {
    handle = (await loadHandle()) ?? null
  } catch {
    handle = null
  }
  if (!handle) return
  const granted = (await handle.queryPermission({ mode: 'readwrite' })) === 'granted'
  setState({ status: granted ? 'on' : 'paused', folder: handle.name, lastSaved: readSaved().lastSaved })
  watch()
}

/** Asks for a folder (must be called from a click) and makes a first backup into it right away */
export async function chooseBackupFolder(): Promise<boolean> {
  let picked: DirectoryHandle
  try {
    picked = await (window as unknown as PickerWindow).showDirectoryPicker({ id: 'lodoc-backup', mode: 'readwrite' })
  } catch {
    return false // cancelled
  }
  handle = picked
  await saveHandle(picked)
  setState({ status: 'on', folder: picked.name, lastSaved: null })
  watch()
  await backUpNow()
  return true
}

/** After a reload: allow writing again (must be called from a click) */
export async function resumeAutoBackup() {
  if (!handle) return
  if ((await handle.requestPermission({ mode: 'readwrite' })) !== 'granted') return
  setState({ status: 'on', folder: handle.name, lastSaved: readSaved().lastSaved })
  await backUpNow()
}

export async function stopAutoBackup() {
  window.clearTimeout(timer)
  timer = undefined
  watching?.unsubscribe()
  watching = null
  handle = null
  await clearHandle()
  try {
    localStorage.removeItem(STATE_KEY)
  } catch {
    // nothing to forget then
  }
  setState({ status: 'off' })
}

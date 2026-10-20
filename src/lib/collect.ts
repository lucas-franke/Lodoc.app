import { useSyncExternalStore } from 'react'
import { logChange } from '@/db/activity'
import { db } from '@/db/db'
import { createNote, noteTitle, updateNote } from '@/db/notes'
import type { StoredBlock } from '@/db/schema'
import { formatDate } from './format'
import { blobToDataUrl, compressImage, NOTE_IMAGE } from './image-compress'

// "Share to Lodoc": the installed app is a share target (manifest.webmanifest, share_target), so text and links
// shared from other apps on Android open Lodoc with them in the URL. Each share becomes a dated bullet at the top
// of one note, the "collect" note, chosen per device with "Collect here" in a note's menu.

const KEY = 'localnotes:collectNote'
const CHANGED = 'localnotes:collect-note-changed'
/** Created (and used from then on) when something is shared before any note was chosen */
const DEFAULT_TITLE = 'Collected'

export function getCollectNoteId(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function setCollectNoteId(id: string) {
  try {
    localStorage.setItem(KEY, id)
  } catch {
    // per-device convenience only
  }
  window.dispatchEvent(new Event(CHANGED))
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGED, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(CHANGED, onChange)
    window.removeEventListener('storage', onChange)
  }
}

/** The note that collects shares on this device (null until one is chosen or created) */
export function useCollectNoteId() {
  return useSyncExternalStore(subscribe, getCollectNoteId, () => null)
}

/** Only the installed app can receive shares, so that's the only place to choose the note */
export const isInstalledApp = () => window.matchMedia('(display-mode: standalone)').matches

/** The note something was just collected into, so it can show the new line arriving when it opens (once) */
let arrivedIn: string | null = null
export const markArrived = (noteId: string) => (arrivedIn = noteId)
export function takeArrived(noteId: string) {
  if (arrivedIn !== noteId) return false
  arrivedIn = null
  return true
}

export type SharedFile = { blob: Blob; name: string }
/** `files`: shared files that are not images (a backup sent from another device, lib/project-file.ts) */
export type Shared = { title: string; text: string; url: string; images?: SharedFile[]; files?: SharedFile[] }

/** The names the manifest's share_target gives the shared fields in the URL */
const PARAMS = { title: 'shared_title', text: 'shared_text', url: 'shared_url' } as const

/**
 * Where the service worker leaves a share that came with files (sw.js in vite.config.ts): the manifest's
 * share_target posts it, the worker keeps it here and opens the app with ?shared. Read once, then removed.
 */
const SHARE_CACHE = 'share-target'

async function readSharedCache(): Promise<Shared | null> {
  if (!('caches' in window)) return null
  const cache = await caches.open(SHARE_CACHE)
  const meta = await cache.match('shared/meta')
  if (!meta) return null
  const { title = '', text = '', url = '', files = 0 } = (await meta.json()) as Partial<Shared> & { files?: number }
  const images: SharedFile[] = []
  const others: SharedFile[] = []
  for (let i = 0; i < files; i++) {
    const file = await cache.match(`shared/${i}`)
    if (!file) continue
    const shared = { blob: await file.blob(), name: decodeURIComponent(file.headers.get('x-name') ?? '') }
    ;(shared.blob.type.startsWith('image/') ? images : others).push(shared)
  }
  await caches.delete(SHARE_CACHE)
  return { title, text, url, images, files: others }
}

/**
 * What was shared to the app (null for a normal start): from the URL, or, for a share with images, from the
 * service worker's cache. Taken out of the URL so a reload doesn't add it again.
 */
export async function takeShared(): Promise<Shared | null> {
  const params = new URLSearchParams(location.search)
  const fromWorker = params.has('shared')
  if (!fromWorker && !Object.values(PARAMS).some((p) => params.has(p))) return null
  const shared = fromWorker
    ? await readSharedCache().catch(() => null)
    : { title: params.get(PARAMS.title) ?? '', text: params.get(PARAMS.text) ?? '', url: params.get(PARAMS.url) ?? '' }
  params.delete('shared')
  for (const p of Object.values(PARAMS)) params.delete(p)
  const rest = params.toString()
  history.replaceState(null, '', location.pathname + (rest ? `?${rest}` : '') + location.hash)
  return shared
}

const URL_PATTERN = /https?:\/\/\S+/

/**
 * Apps fill the fields differently: Chrome sends a page's title and puts its address in the text, a shared
 * selection comes as "the text" plus a link to it. So: the link is the url field or the first address in the
 * text, and the text is what's left, without the quotes around a selection.
 */
export function readShared({ title, text, url }: Shared) {
  let link = url.trim()
  let rest = text
  const found = rest.match(URL_PATTERN)
  if (found) {
    if (!link) link = found[0]
    if (found[0] === link) rest = rest.replace(found[0], '')
  }
  rest = rest
    .trim()
    .replace(/\n\s*\n+/g, '\n')
    .replace(/^["“„'‘](.*)["”“'’]$/s, '$1')
    .trim()
  return { text: rest, link, label: title.trim() || (link ? hostname(link) : '') }
}

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** 19.10.2026 */
const today = () => formatDate(new Date())

const text = (t: string) => ({ type: 'text', text: t, styles: {} })

/** The shared item as a bullet: "19.10.2026: the text the page", the page linked, shared images under it */
async function sharedBlock(shared: Shared): Promise<StoredBlock | null> {
  const { text: body, link, label } = readShared(shared)
  const images = await Promise.all(
    (shared.images ?? []).map(async ({ blob, name }) => {
      try {
        return { id: crypto.randomUUID(), type: 'image', props: { url: await blobToDataUrl(await compressImage(blob, NOTE_IMAGE)), name }, children: [] }
      } catch {
        return null // not an image the browser can read
      }
    }),
  ).then((all) => all.filter((i) => i !== null))
  if (!body && !link && !images.length) return null
  const what = body || (link ? '' : images.length === 1 ? 'Image' : `${images.length} images`)
  const content: unknown[] = [text(`${today()}: ${what}`)]
  if (link) {
    if (body) content.push(text(' '))
    content.push({ type: 'link', href: link, content: [text(label)] })
  }
  return {
    id: crypto.randomUUID(),
    type: 'bulletListItem',
    props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
    content,
    // The images inside the bullet, like images added to a list in the editor
    children: images,
  } as StoredBlock
}

/**
 * Adds what was shared at the top of the collect note (creating "Collected" if there is none, or it was
 * deleted). Returns the note, whether it was just created, and whether anything was added.
 */
export async function collectShared(shared: Shared): Promise<{ noteId: string; title: string; created: boolean; added: boolean }> {
  const block = await sharedBlock(shared)
  const savedId = getCollectNoteId()
  const existing = savedId ? await db.notes.get(savedId) : undefined
  if (existing) {
    if (block) {
      await updateNote(existing.id, { content: [block, ...existing.content] })
      logChange('Added from another app', { type: 'note', id: existing.id, title: noteTitle(existing) })
    }
    return { noteId: existing.id, title: noteTitle(existing), created: false, added: !!block }
  }
  const id = await createNote(null)
  await updateNote(id, { title: DEFAULT_TITLE, content: block ? [block] : [] })
  setCollectNoteId(id)
  if (block) logChange('Added from another app', { type: 'note', id, title: DEFAULT_TITLE })
  return { noteId: id, title: DEFAULT_TITLE, created: true, added: !!block }
}

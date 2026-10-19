import { z } from 'zod'
import { db } from '@/db/db'
import { saveFile } from './save-file'
import { logChange } from '@/db/activity'
import { parseAppearance, type Appearance } from './appearance'
import { getAppearance } from '@/hooks/useAppearance'
import { coverAssetId, type Asset, type Board, type Folder, type Note } from '@/db/schema'

// Version 2 adds boards and the images they use; version 3 adds note covers and card views; version 4 adds
// the theme and appearance settings. Older files still import (and leave the current settings as they are).
const FORMAT_VERSION = 4
const LAST_EXPORT_KEY = 'localnotes:lastExport'

const folderSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  parentId: z.string().nullable(),
  order: z.number(),
  createdAt: z.number(),
})

const noteSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  // BlockNote's own format; validated structurally only
  content: z.array(z.looseObject({ type: z.string() })),
  folderId: z.string().nullable(),
  // Missing in files exported before manual ordering; filled in below
  order: z.number().optional(),
  favorite: z.boolean(),
  pinned: z.boolean(),
  tags: z.array(z.string()).default([]),
  cover: z.union([z.object({ assetId: z.string() }), z.object({ gradient: z.string() })]).nullable().optional(),
  journal: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
})

const nodeBase = {
  id: z.string().min(1),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
}

const cardViewSchema = z.enum(['full', 'cover', 'title'])

const boardNodeSchema = z.discriminatedUnion('type', [
  z.object({ ...nodeBase, type: z.literal('note'),
    noteId: z.string(),
    view: cardViewSchema.optional(),
    restoreHeight: z.number().optional(),
  }),
  z.object({ ...nodeBase, type: z.literal('text'), text: z.string(), size: z.enum(['s', 'm', 'l']) }),
  z.object({ ...nodeBase, type: z.literal('image'), assetId: z.string(), alt: z.string().optional() }),
  z.object({ ...nodeBase, type: z.literal('frame'), title: z.string() }),
])

const boardEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string(),
  target: z.string(),
  label: z.string().optional(),
})

const boardSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  folderId: z.string().nullable().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
  viewport: z.object({ x: z.number(), y: z.number(), zoom: z.number() }),
  noteView: cardViewSchema.optional(),
  nodes: z.array(boardNodeSchema),
  edges: z.array(boardEdgeSchema).optional(),
})

/** An image in the file: the bytes as base64 text. */
const assetFileSchema = z.object({
  id: z.string().min(1),
  mimeType: z.string(),
  name: z.string(),
  width: z.number(),
  height: z.number(),
  createdAt: z.number(),
  data: z.string(),
})

const THEMES = ['light', 'dark', 'system'] as const
type Theme = (typeof THEMES)[number]

/** Light/dark and the Appearance panel. A damaged part is skipped rather than failing the whole import. */
const settingsSchema = z.object({
  theme: z.enum(THEMES).optional().catch(undefined),
  appearance: z.record(z.string(), z.unknown()).optional().catch(undefined),
})

const projectSchema = z.object({
  app: z.literal('localnotes'),
  version: z.number().int().max(FORMAT_VERSION),
  exportedAt: z.number(),
  folders: z.array(folderSchema),
  notes: z.array(noteSchema),
  // Not in version 1 files
  boards: z.array(boardSchema).default([]),
  assets: z.array(assetFileSchema).default([]),
  // Not before version 4
  settings: settingsSchema.optional().catch(undefined),
})

export type ProjectSettings = { theme?: Theme; appearance?: Appearance }

export type ProjectFile = {
  folders: Folder[]
  notes: Note[]
  boards: Board[]
  assets: Asset[]
  exportedAt: number
  /** Missing in files from before version 4 */
  settings?: ProjectSettings
}

/** The light/dark choice, as next-themes keeps it */
function currentTheme(): Theme {
  try {
    const saved = localStorage.getItem('theme')
    return THEMES.find((t) => t === saved) ?? 'system'
  } catch {
    return 'system'
  }
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}

function base64ToBlob(data: string, type: string): Blob {
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type })
}

const boardImageIds = (boards: Board[]) =>
  boards.flatMap((b) => b.nodes.flatMap((n) => (n.type === 'image' ? [n.assetId] : [])))
const coverIds = (notes: Note[]) => notes.flatMap((n) => coverAssetId(n) ?? [])

/** Everything as a backup file (also used by the automatic backup) */
export async function buildProjectBlob(): Promise<Blob> {
  const [folders, notes, boards] = await Promise.all([db.folders.toArray(), db.notes.toArray(), db.boards.toArray()])
  // Only images that a board or a note cover still uses (removing an image from a board leaves its bytes behind)
  const used = await db.assets.bulkGet([...new Set([...boardImageIds(boards), ...coverIds(notes)])])
  const assets = await Promise.all(
    used.flatMap((a) => (a ? [a] : [])).map(async ({ blob, ...a }) => ({ ...a, data: await blobToBase64(blob) })),
  )
  const settings: ProjectSettings = { theme: currentTheme(), appearance: getAppearance() }
  const data = { app: 'localnotes', version: FORMAT_VERSION, exportedAt: Date.now(), settings, folders, notes, boards, assets }
  return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
}

export async function exportProject() {
  const blob = await buildProjectBlob()
  const now = Date.now()
  saveFile(blob, `lodoc-${new Date(now).toISOString().slice(0, 10)}.json`)
  setLastExport(now)
  logChange('Backup file saved')
}

/** Remembers when the last backup was made (for the reminder in the sidebar) */
export function setLastExport(time: number) {
  try {
    localStorage.setItem(LAST_EXPORT_KEY, String(time))
  } catch {
    // storage unavailable; the hint just won't update
  }
}

export function getLastExport(): number | null {
  try {
    const value = localStorage.getItem(LAST_EXPORT_KEY)
    return value ? Number(value) : null
  } catch {
    return null
  }
}

/** Parses and validates a project file. Throws an Error with a readable message. */
export async function readProjectFile(file: File): Promise<ProjectFile> {
  let json: unknown
  try {
    json = JSON.parse(await file.text())
  } catch {
    throw new Error('The file is not valid JSON.')
  }
  const header = json as { app?: unknown; version?: unknown } | null
  if (header?.app === 'localnotes' && typeof header.version === 'number' && header.version > FORMAT_VERSION) {
    throw new Error('This file was created by a newer version of Lodoc. Update the app to open it.')
  }
  const result = projectSchema.safeParse(json)
  if (!result.success) {
    const issue = result.error.issues[0]
    const where = issue?.path.length ? ` (at ${issue.path.join('.')})` : ''
    throw new Error(`This is not a valid Lodoc project file${where}.`)
  }
  const { folders, notes, boards, assets, exportedAt, settings: savedSettings } = result.data
  const settings: ProjectSettings | undefined = savedSettings && {
    theme: savedSettings.theme,
    appearance: savedSettings.appearance && parseAppearance(savedSettings.appearance),
  }
  let restored: Asset[]
  try {
    restored = assets.map(({ data, ...a }) => ({ ...a, blob: base64ToBlob(data, a.mimeType) }))
  } catch {
    throw new Error('An image in this file is damaged.')
  }
  const withOrder = notes.map((n) => ({ ...n, order: n.order ?? -n.updatedAt }))
  return { folders, notes: withOrder as Note[], boards, assets: restored, exportedAt, settings }
}

/** "2 notes, 1 folder and 3 boards" */
export function describeProject(project: ProjectFile) {
  const count = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
  const parts = [count(project.notes.length, 'note'), count(project.folders.length, 'folder')]
  if (project.boards.length) parts.push(count(project.boards.length, 'board'))
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0]
}

export type ImportMode = 'replace' | 'merge'

export async function importProject(project: ProjectFile, mode: ImportMode) {
  await db.transaction('rw', [db.folders, db.notes, db.boards, db.assets, db.trash], async () => {
    if (mode === 'replace') {
      await Promise.all([db.folders.clear(), db.notes.clear(), db.boards.clear(), db.assets.clear(), db.trash.clear()])
      await db.folders.bulkAdd(project.folders)
      await db.notes.bulkAdd(project.notes)
      await db.boards.bulkAdd(project.boards)
      await db.assets.bulkAdd(project.assets)
      return
    }
    // Merge: folders are upserted; notes and boards keep whichever version was edited last
    await db.folders.bulkPut(project.folders)
    const newer = async <T extends { id: string; updatedAt: number }>(table: { bulkGet: (ids: string[]) => Promise<(T | undefined)[]> }, items: T[]) => {
      const existing = await table.bulkGet(items.map((i) => i.id))
      return items.filter((item, i) => !existing[i] || item.updatedAt > existing[i]!.updatedAt)
    }
    const notes = await newer(db.notes, project.notes)
    await db.notes.bulkPut(notes)
    const boards = await newer(db.boards, project.boards)
    await db.boards.bulkPut(boards)
    // Images are immutable: add the ones the written boards and notes use that we don't have yet
    const wanted = [...new Set([...boardImageIds(boards), ...coverIds(notes)])]
    const have = await db.assets.bulkGet(wanted)
    const missing = new Set(wanted.filter((_, i) => !have[i]))
    await db.assets.bulkAdd(project.assets.filter((a) => missing.has(a.id)))
  })
  logChange(`${mode === 'replace' ? 'Replaced everything with' : 'Merged in'} ${describeProject(project)} from a backup`)
}

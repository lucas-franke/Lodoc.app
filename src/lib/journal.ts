import { db } from '@/db/db'
import { createFolder } from '@/db/folders'
import { createFromTemplate } from './templates'

// "Today's journal": one note per day, made from the journal template and found again by its date. New days go
// where the last journal note is (so moving them to another folder is remembered), or at first into "Journal".

const FOLDER_NAME = 'Journal'

/** "2026-10-20", in local time */
function dayKey(date = new Date()) {
  const two = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`
}

async function journalFolder(): Promise<string | null> {
  const journals = await db.notes.filter((note) => !!note.journal).toArray()
  const latest = journals.sort((a, b) => b.createdAt - a.createdAt)[0]
  if (latest) return latest.folderId && (await db.folders.get(latest.folderId)) ? latest.folderId : null
  const existing = await db.folders
    .filter((folder) => folder.parentId === null && folder.name.trim().toLowerCase() === FOLDER_NAME.toLowerCase())
    .first()
  return existing?.id ?? createFolder(FOLDER_NAME)
}

/** The id of today's journal note, created if there isn't one yet */
export async function openTodaysJournal(): Promise<string> {
  const today = dayKey()
  const existing = await db.notes.filter((note) => note.journal === today).first()
  if (existing) return existing.id
  const id = await createFromTemplate('journal', await journalFolder())
  await db.notes.update(id, { journal: today })
  return id
}

/** An app shortcut (manifest.webmanifest) opens Lodoc with ?journal; taken out of the URL so a reload is a normal start */
export function takeJournalFromUrl(): boolean {
  const params = new URLSearchParams(location.search)
  if (!params.has('journal')) return false
  params.delete('journal')
  const search = params.toString()
  history.replaceState(null, '', location.pathname + (search ? `?${search}` : '') + location.hash)
  return true
}

import type { DefaultReactSuggestionItem } from '@blocknote/react'
import { FilePlus, FileText } from 'lucide-react'
import { db } from '@/db/db'
import { createNote, noteTitle, sortNotes, updateNote } from '@/db/notes'

/**
 * The items of the "@" menu: matching notes (not the current one), plus creating a new note with the typed
 * name. `insert` puts the link at the cursor.
 */
export async function noteLinkItems(
  query: string,
  currentId: string,
  insert: (noteId: string, title: string) => void,
): Promise<DefaultReactSuggestionItem[]> {
  const q = query.trim().toLowerCase()
  const notes = sortNotes((await db.notes.toArray()).filter((n) => n.id !== currentId && noteTitle(n).toLowerCase().includes(q))).slice(0, 8)
  const folders = new Map((await db.folders.toArray()).map((f) => [f.id, f.name]))
  const items: DefaultReactSuggestionItem[] = notes.map((n) => ({
    title: noteTitle(n),
    subtext: n.folderId ? folders.get(n.folderId) : undefined,
    icon: <FileText className="size-4" />,
    onItemClick: () => insert(n.id, noteTitle(n)),
  }))
  if (q && !notes.some((n) => noteTitle(n).toLowerCase() === q)) {
    items.push({
      title: `New note "${query.trim()}"`,
      subtext: 'Create it and link to it',
      icon: <FilePlus className="size-4" />,
      onItemClick: async () => {
        const id = await createNote()
        await updateNote(id, { title: query.trim() })
        insert(id, query.trim())
      },
    })
  }
  return items
}

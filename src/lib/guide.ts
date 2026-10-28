import { db } from '@/db/db'
import { createNote } from '@/db/notes'
import type { StoredBlock } from '@/db/schema'
import { h, li, p, todo } from './blocks'

// "Getting started": an ordinary note that shows the main features by example. Created on request
// (welcome screen, command palette); asking again opens the existing one. It can be edited or deleted.

const KEY = 'localnotes:guideNote'
const TITLE = 'Getting started with Lodoc'

const CONTENT: StoredBlock[] = [
  p('Lodoc keeps your notes in this browser: no account, no server. This note shows the basics. Edit it, try things out, and delete it when you are done.'),
  h(2, 'Writing'),
  li('Type ', { text: '/', code: true }, ' at the start of a line for headings, lists, checklists, tables, images and more.'),
  li('Markdown shortcuts work too: ', { text: '#', code: true }, ' for a heading, ', { text: '-', code: true }, ' for a list, ', { text: '[]', code: true }, ' for a checklist.'),
  li('Click or tap the cover above the title to pick another gradient or your own image.'),
  li('Type ', { text: '@', code: true }, ' to link to another note. The linked note lists this one under "Linked from".'),
  li('Add tags under the title, or just write them in the text (like #ideas), to find related notes on one page. Ctrl+click a tag in the text to open it.'),
  li('Type ', { text: '->', code: true }, ' or ', { text: '<-', code: true }, ' for arrows (→ ←); Backspace right after keeps what you typed.'),
  h(2, 'Finding things'),
  li({ text: 'Search', bold: true }, ' at the top of the sidebar (or Ctrl+K) opens the command palette: search every note by title and text, and run commands.'),
  li('Folders, favorites (the star at the top right) and pinned notes keep the sidebar tidy.'),
  li('With a keyboard, press ', { text: '?', code: true }, ' to see all shortcuts.'),
  li('In the installed app on Android, share text or links from other apps to Lodoc: they are collected with the date in one note. "Collect here" in a note’s menu picks which.'),
  h(2, 'Boards'),
  li('A board is an infinite canvas: add notes as cards, text and images with the round + button.'),
  li('Drag a note from the sidebar onto a board, or pick it with + → Note. Double-click a card (or use its pencil) to edit the note right there.'),
  h(2, 'Make it yours'),
  li('Settings (bottom of the sidebar) → Appearance changes colors, font, text size, the sidebar, corners and textures.'),
  h(2, 'Keep your notes safe'),
  li('Everything lives in this browser. Use Backup (bottom of the sidebar) to export a copy now and then.'),
  li('Deleted notes go to the Trash for 30 days, so a slip is easy to undo.'),
  h(2, 'Try it'),
  todo('Create a note with the pencil at the top of the sidebar (or Ctrl+Alt+N)'),
  todo('Make a folder and move the note into it (drag it there, or Move to in its menu)'),
  todo('Open a board and add this note as a card'),
  todo('Export a backup'),
]

/** Opens the guide note, creating it the first time (or again, if it was deleted). Returns its id. */
export async function openGuideNote(): Promise<string> {
  try {
    const known = localStorage.getItem(KEY)
    if (known && (await db.notes.get(known))) return known
  } catch {
    // fall through and create it
  }
  const id = await createNote()
  await db.notes.update(id, { title: TITLE, content: CONTENT, updatedAt: Date.now() })
  try {
    localStorage.setItem(KEY, id)
  } catch {
    // remembering it is only a convenience
  }
  return id
}

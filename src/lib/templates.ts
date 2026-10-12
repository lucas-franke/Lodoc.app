import { CalendarDays, ClipboardList, ListChecks, Users, type LucideIcon } from 'lucide-react'
import { createNote } from '@/db/notes'
import { db } from '@/db/db'
import type { StoredBlock } from '@/db/schema'
import { h, li, p, todo } from './blocks'

// Ready-made starting points for common notes. A template only fills a new note; nothing links back to it.

const today = () => new Intl.DateTimeFormat('en', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
const shortDate = () => new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date())

export const TEMPLATES: { id: string; name: string; icon: LucideIcon; title: () => string; content: () => StoredBlock[] }[] = [
  {
    id: 'meeting',
    name: 'Meeting notes',
    icon: Users,
    title: () => `Meeting – ${shortDate()}`,
    content: () => [h(2, 'Attendees'), li(), h(2, 'Agenda'), li(), h(2, 'Notes'), p(), h(2, 'Action items'), todo()],
  },
  {
    id: 'journal',
    name: 'Daily journal',
    icon: CalendarDays,
    title: today,
    content: () => [h(2, 'Grateful for'), li(), h(2, 'What would make today great'), todo(), h(2, 'Notes'), p()],
  },
  {
    id: 'project',
    name: 'Project plan',
    icon: ClipboardList,
    title: () => 'New project',
    content: () => [h(2, 'Goal'), p(), h(2, 'Milestones'), todo(), h(2, 'Open questions'), li(), h(2, 'Links'), li()],
  },
  {
    id: 'todo',
    name: 'To-do list',
    icon: ListChecks,
    title: () => 'To-do',
    content: () => [todo(), todo(), todo()],
  },
]

/** A new note filled from a template, in the given folder. Returns its id. */
export async function createFromTemplate(templateId: string, folderId: string | null = null) {
  const template = TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0]
  const id = await createNote(folderId)
  await db.notes.update(id, { title: template.title(), content: template.content(), updatedAt: Date.now() })
  return id
}

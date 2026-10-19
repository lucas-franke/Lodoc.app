import { CalendarDays, ClipboardList, ListChecks, Users, type LucideIcon } from 'lucide-react'
import { createNote } from '@/db/notes'
import { db } from '@/db/db'
import type { StoredBlock } from '@/db/schema'
import { h, li, p, todo } from './blocks'
import { formatDate, formatLongDate } from './format'

// Ready-made starting points for common notes. A template only fills a new note; nothing links back to it.

const today = () => formatLongDate(new Date())
const shortDate = () => formatDate(new Date())

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

/** What the empty line under each template heading is for (shown as its placeholder, see template-hints.ts) */
export const HEADING_HINTS: Record<string, string> = {
  attendees: "Who's there",
  agenda: 'Topic',
  notes: 'Anything worth remembering',
  'action items': 'Who does what by when',
  'grateful for': 'Something small counts too',
  'what would make today great': 'One thing for today',
  goal: 'What does done look like?',
  milestones: 'The first step',
  'open questions': "What's still unclear?",
  links: 'Paste a link',
}

/** A new note as a copy of one of your own templates (a note marked as template), in the given folder. Returns its id. */
export async function createFromNote(templateId: string, folderId: string | null = null) {
  const template = await db.notes.get(templateId)
  const id = await createNote(folderId)
  if (!template) return id
  await db.notes.update(id, {
    title: template.title,
    content: structuredClone(template.content),
    tags: [...template.tags],
    // A chosen cover comes along; the generated one stays the new note's own
    ...(template.cover !== undefined ? { cover: template.cover } : {}),
    updatedAt: Date.now(),
  })
  return id
}

/** A new note filled from a template, in the given folder. Returns its id. */
export async function createFromTemplate(templateId: string, folderId: string | null = null) {
  const template = TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0]
  const id = await createNote(folderId)
  await db.notes.update(id, { title: template.title(), content: template.content(), updatedAt: Date.now() })
  return id
}

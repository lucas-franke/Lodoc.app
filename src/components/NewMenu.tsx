import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronDown, FileText, FolderPlus, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createBoard } from '@/db/boards'
import { db } from '@/db/db'
import { createFolder } from '@/db/folders'
import { noteTitle, sortNotes } from '@/db/notes'
import { openBoard, openFolder, openNote } from '@/hooks/useRoute'
import { createFromNote, createFromTemplate, TEMPLATES } from '@/lib/templates'

/**
 * "New… ▾" next to "New note" (overview, folder pages): a folder, a board, or a note with a ready-made structure, all
 * in `folderId`. The built-in templates come first, then your own (notes marked "Use as template"). One menu instead
 * of a row of buttons, so the page starts with what's in it.
 */
export function NewMenu({ folderId = null }: { folderId?: string | null }) {
  const own = useLiveQuery(async () => sortNotes(await db.notes.filter((n) => !!n.template).toArray()), [], [])
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          New… <ChevronDown className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuItem onSelect={async () => openFolder(await createFolder('New folder', folderId))}>
          <FolderPlus /> Folder
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={async () => openBoard(await createBoard(folderId))}>
          <LayoutDashboard /> Board
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Note from a template</DropdownMenuLabel>
        {TEMPLATES.map((t) => (
          <DropdownMenuItem key={t.id} onSelect={async () => openNote(await createFromTemplate(t.id, folderId))}>
            <t.icon /> {t.name}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        {own.length ? (
          <>
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Your templates</DropdownMenuLabel>
            {own.map((note) => (
              <DropdownMenuItem key={note.id} onSelect={async () => openNote(await createFromNote(note.id, folderId))}>
                <FileText /> <span className="truncate">{noteTitle(note)}</span>
              </DropdownMenuItem>
            ))}
          </>
        ) : (
          <p className="px-2 py-1.5 text-xs leading-relaxed text-muted-foreground">
            Any note can be a template: choose “Use as template” in its menu.
          </p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

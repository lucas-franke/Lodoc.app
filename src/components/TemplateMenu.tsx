import { ChevronDown, LayoutTemplate } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { openNote } from '@/hooks/useRoute'
import { createFromTemplate, TEMPLATES } from '@/lib/templates'

/** "From template ▾" next to "New note": a new note with a ready-made structure, in `folderId`. */
export function TemplateMenu({ folderId = null }: { folderId?: string | null }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <LayoutTemplate /> From template <ChevronDown className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        {TEMPLATES.map((t) => (
          <DropdownMenuItem key={t.id} onSelect={async () => openNote(await createFromTemplate(t.id, folderId))}>
            <t.icon /> {t.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

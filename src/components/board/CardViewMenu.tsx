import { ChevronDown } from 'lucide-react'
import { CARD_VIEW_INFO } from '@/components/note/card-views'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NOTE_CARD_VIEWS, type NoteCardView } from '@/db/schema'

/**
 * How much every note card on the board shows. A labeled menu rather than three bare icons, so it is clear
 * that it applies to all cards (single cards can still be changed in their own menu).
 */
export function CardViewMenu({ value, onChange }: { value: NoteCardView; onChange: (view: NoteCardView) => void }) {
  const { label, icon: Icon } = CARD_VIEW_INFO[value]
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="nodrag bg-background shadow-sm">
          <Icon />
          Cards: {label}
          <ChevronDown className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">All cards on this board</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(v as NoteCardView)}>
          {NOTE_CARD_VIEWS.map((view) => {
            const info = CARD_VIEW_INFO[view]
            return (
              <DropdownMenuRadioItem key={view} value={view} className="items-start">
                <info.icon className="mt-0.5" />
                <span className="flex flex-col">
                  <span>{info.label}</span>
                  <span className="text-xs text-muted-foreground">{info.hint}</span>
                </span>
              </DropdownMenuRadioItem>
            )
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

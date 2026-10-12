import { FileText, Image, SquareDashed, Type } from 'lucide-react'
import { useState } from 'react'
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import type { Note } from '@/db/schema'
import { itemLabel, type BoardFlowNode } from './flow'

const ICONS = { note: FileText, text: Type, image: Image, frame: SquareDashed }

/** "Connect to…": draws an arrow from one item to the item picked here (the keyboard way to connect). */
export function ConnectPicker({
  from,
  nodes,
  notes,
  onClose,
  onPick,
}: {
  /** The item the arrow starts at; null = closed */
  from: BoardFlowNode | null
  nodes: BoardFlowNode[]
  notes: Map<string, Note>
  onClose: () => void
  onPick: (targetId: string) => void
}) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const items = nodes
    .filter((n) => n.id !== from?.id)
    .map((n) => ({ id: n.id, type: n.data.type, label: itemLabel(n.data, notes) }))
    .filter((i) => !q || i.label.toLowerCase().includes(q))

  const close = () => {
    setQuery('')
    onClose()
  }

  return (
    <CommandDialog
      open={!!from}
      onOpenChange={(open) => !open && close()}
      title={`Connect “${from ? itemLabel(from.data, notes) : ''}” to…`}
      description="Pick the item the arrow points to."
    >
      <Command shouldFilter={false} label="Search items on this board">
        <CommandInput placeholder="Search items on this board…" value={query} onValueChange={setQuery} />
        <CommandList>
          <CommandEmpty>Nothing else on this board matches.</CommandEmpty>
          <CommandGroup>
            {items.map((item) => {
              const Icon = ICONS[item.type]
              return (
                <CommandItem
                  key={item.id}
                  value={item.id}
                  className="min-h-9"
                  onSelect={() => {
                    close()
                    onPick(item.id)
                  }}
                >
                  <Icon className="text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                </CommandItem>
              )
            })}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  )
}

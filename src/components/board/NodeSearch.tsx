import { FileText, Search, SquareDashed, Type } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Tip } from '@/components/Tip'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { noteText, noteTitle } from '@/db/notes'
import type { Note } from '@/db/schema'
import { frameTitle, type BoardFlowNode } from './flow'

const MAX_RESULTS = 8

interface Result {
  id: string
  title: string
  detail: string
  type: 'note' | 'text' | 'frame'
  haystack: string
}

/**
 * "Find on board": a search button beside the card controls that opens a field below it. Type to filter the
 * notes, texts and frames on this board by title or content; picking one selects it and zooms to it (also when
 * it is far off screen). Escape, a click elsewhere or a pick closes it again.
 */
export function NodeSearch({
  nodes,
  notes,
  onFind,
}: {
  nodes: BoardFlowNode[]
  notes: Map<string, Note>
  onFind: (nodeId: string) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  // The field only exists while searching; the button stands in for it otherwise
  const [expanded, setExpanded] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const close = (refocus: boolean) => {
    setExpanded(false)
    setOpen(false)
    setQuery('')
    if (refocus) requestAnimationFrame(() => button.current?.focus())
  }

  const items = useMemo<Result[]>(
    () =>
      nodes.flatMap((n): Result[] => {
        const d = n.data
        if (d.type === 'note') {
          const note = notes.get(d.noteId)
          if (!note) return []
          return [
            { id: n.id, type: 'note', title: noteTitle(note), detail: 'Note', haystack: noteText(note).toLowerCase() },
          ]
        }
        if (d.type === 'text') {
          const line = d.text.trim().split('\n')[0]
          return [{ id: n.id, type: 'text', title: line, detail: 'Text', haystack: d.text.toLowerCase() }]
        }
        if (d.type === 'frame' && d.title.trim()) {
          return [{ id: n.id, type: 'frame', title: frameTitle(d.title), detail: 'Frame', haystack: d.title.toLowerCase() }]
        }
        return []
      }),
    [nodes, notes],
  )

  const q = query.trim().toLowerCase()
  const matches = q ? items.filter((i) => i.haystack.includes(q)).slice(0, MAX_RESULTS) : []
  const showList = open && q !== ''

  const pick = (id: string) => {
    close(false)
    onFind(id)
  }

  return (
    // Not positioned itself: the field anchors to the right edge of the whole control group (the canvas panel),
    // so on a phone it stays on screen
    <div>
      <Tip label="Find on board">
        <Button
          ref={button}
          variant="outline"
          size="icon-sm"
          className="nodrag bg-background shadow-sm"
          aria-label="Find on board"
          aria-expanded={expanded}
          onClick={() => (expanded ? close(false) : setExpanded(true))}
        >
          <Search />
        </Button>
      </Tip>
      {expanded && (
        <Command
          shouldFilter={false}
          label="Find on board"
          // Right-aligned under the controls, clear of the board's title on the left
          className="absolute top-full right-0 mt-1.5 h-auto w-72 max-w-[calc(100vw-2rem)] overflow-visible rounded-xl border bg-background shadow-md [&_[data-slot=command-input-wrapper]]:p-1"
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null) && e.relatedTarget !== button.current) close(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation()
              close(true)
            }
          }}
        >
          <CommandInput
            autoFocus
            placeholder="Find on board…"
            value={query}
            onValueChange={(value) => {
              setQuery(value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
          />
          {/* Always rendered (just hidden): the input points at this list with aria-controls */}
          <CommandList className={cn('max-h-72 border-t', !showList && 'hidden')}>
            <CommandEmpty>Nothing on this board matches.</CommandEmpty>
            <CommandGroup>
              {matches.map((item) => (
                <CommandItem key={item.id} value={item.id} onSelect={() => pick(item.id)} className="min-h-9">
                  {item.type === 'note' ? (
                    <FileText className="text-muted-foreground" />
                  ) : item.type === 'frame' ? (
                    <SquareDashed className="text-muted-foreground" />
                  ) : (
                    <Type className="text-muted-foreground" />
                  )}
                  <span className="min-w-0 flex-1 truncate">{item.title}</span>
                  <span className="text-xs text-muted-foreground">{item.detail}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      )}
    </div>
  )
}

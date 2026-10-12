import { useStore } from '@xyflow/react'
import { FileText, ImagePlus, Plus, SquareDashed, Type } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { NotePicker } from './NotePicker'

/**
 * The button that adds items to a board. One element with two positions, derived from `empty`:
 * centered (with a hint) while the board has no items, bottom-right once it has some. Because it is
 * the same element, it slides between the two and its menu stays attached.
 */
export function BoardFab({
  empty,
  excludeNoteIds,
  onPickNote,
  onAddText,
  onAddImages,
  onAddFrame,
}: {
  empty: boolean
  excludeNoteIds: Set<string>
  onPickNote: (noteId: string) => void
  onAddText: () => void
  onAddImages: (files: File[]) => void
  onAddFrame: () => void
}) {
  const hasSelection = useStore((s) => s.nodes.some((n) => n.selected))
  const [pickerOpen, setPickerOpen] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  // A menu hands focus back to its button when it closes; skip that when the chosen action
  // moves focus somewhere else (the new text field, the picker dialog).
  const focusMoved = useRef(false)

  return (
    <>
      {empty && (
        <div
          data-testid="board-empty-hint"
          className="pointer-events-none absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-[calc(100%+2.5rem)] text-center"
        >
          <p className="text-sm text-muted-foreground">This board is empty.</p>
          <p className="text-xs text-muted-foreground">Add a note, some text, an image or a frame, or drag a note here from the sidebar.</p>
        </div>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            data-testid="board-fab"
            data-position={empty ? 'center' : 'corner'}
            aria-label="Add item"
            className={cn(
              'absolute z-10 size-14 rounded-full shadow-lg',
              'transition-[left,top,translate] duration-300 ease-out motion-reduce:transition-none',
              empty
                ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
                : 'top-[calc(100%-5rem)] left-[calc(100%-5rem)] translate-x-0 translate-y-0',
            )}
          >
            <Plus className="size-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side={empty ? 'bottom' : 'top'}
          align={empty ? 'center' : 'end'}
          className="w-48"
          onCloseAutoFocus={(e) => {
            if (focusMoved.current) {
              e.preventDefault()
              focusMoved.current = false
            }
          }}
        >
          <DropdownMenuItem
            onSelect={() => {
              focusMoved.current = true
              setPickerOpen(true)
            }}
          >
            <FileText /> Note…
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              focusMoved.current = true
              onAddText()
            }}
          >
            <Type /> Text
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => fileInput.current?.click()}>
            <ImagePlus /> Image…
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              focusMoved.current = true
              onAddFrame()
            }}
          >
            <SquareDashed /> {hasSelection ? 'Frame around selection' : 'Frame'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => {
          const files = [...(e.target.files ?? [])]
          e.target.value = ''
          if (files.length) onAddImages(files)
        }}
      />

      <NotePicker open={pickerOpen} onOpenChange={setPickerOpen} excludeIds={excludeNoteIds} onPick={onPickNote} />
    </>
  )
}

import { NodeResizer, useStore, type NodeProps } from '@xyflow/react'
import { Check, ExternalLink, MoreHorizontal, Pencil, Spline, X } from 'lucide-react'
import { RowDropdownMenu, type MenuEntry } from '@/components/ItemMenu'
import { Button } from '@/components/ui/button'
import { CARD_VIEW_INFO } from '@/components/note/card-views'
import { NoteCardBody, NoteCardTop } from '@/components/note/NoteCardBody'
import { noteTitle } from '@/lib/note-text'
import { NOTE_CARD_VIEWS, type BoardNode } from '@/db/schema'
import { openNote } from '@/hooks/useRoute'
import { cn } from '@/lib/utils'
import { useBoard } from '../board-context'
import { ConnectHandles } from '../ConnectHandles'
import { cardView, TITLE_HEIGHT, type BoardFlowNode } from '../flow'

type NoteItem = Extract<BoardNode, { type: 'note' }>

/**
 * A live view of an existing note: title and text preview, read straight from the notes table.
 * Double-click (or the pencil) turns it into the real editor; edits are saved to the note itself, so
 * every other view of it (sidebar, folder cards, other boards) updates at once.
 */
export function NoteNode({ id, data, selected }: NodeProps<BoardFlowNode>) {
  // The details line is unreadable when zoomed far out, so it is left out there (like labels on a map)
  const zoomedOut = useStore((s) => s.transform[2] < 0.6)
  const { noteId } = data as NoteItem
  const board = useBoard()
  const note = board.notes.get(noteId)
  const title = note ? noteTitle(note) : 'Note no longer exists'
  const editing = !!note && board.editingId === id
  const view = cardView(data as NoteItem)
  const collapsed = view === 'title' && !editing
  // Zoomed out, the title grows to stay readable (index.css): the buttons, too small to hit there, make room for it
  const titleOnly = zoomedOut && !editing

  const entries: MenuEntry[] = [
    ...(note ? [{ type: 'item' as const, label: 'Open note', icon: ExternalLink, onSelect: () => openNote(noteId) }] : []),
    ...(note && !editing
      ? NOTE_CARD_VIEWS.filter((v) => v !== view).map((v) => ({
          type: 'item' as const,
          label: `Show ${CARD_VIEW_INFO[v].label.toLowerCase()} view`,
          icon: CARD_VIEW_INFO[v].icon,
          onSelect: () => board.setCardView(id, v),
        }))
      : []),
    { type: 'item', label: 'Connect to…', icon: Spline, onSelect: () => board.connectFrom(id) },
    { type: 'separator' },
    { type: 'item', label: 'Remove from board', icon: X, onSelect: () => board.removeNodes([id]) },
  ]

  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={200}
        minHeight={view === 'title' ? TITLE_HEIGHT : 120}
        maxHeight={view === 'title' ? TITLE_HEIGHT : undefined}
        onResizeStart={board.beginInteraction}
        onResizeEnd={(_, box) => board.resizeEnd(id, box)}
      />
      {!editing && <ConnectHandles />}
      <div
        data-testid="board-note"
        data-editing={editing}
        className={cn(
          'group/board-card flex h-full w-full flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm',
          selected && 'border-ring',
          editing && 'ring-2 ring-ring/40',
        )}
        onDoubleClick={() => note && !editing && board.editNote(id)}
      >
        {/* Like the cards on the overview: the cover first (not while editing, where the editor is the card) */}
        {note && !editing && <NoteCardTop note={note} view={view} fill />}
        <div className={cn('relative flex min-h-10 shrink-0 items-center gap-1 px-3', editing && 'border-b pr-1')}>
          {/* While editing, the editor's own title field is right below, so the header doesn't repeat it */}
          <span
            className={cn(
              'board-title min-w-0 flex-1 font-page text-sm font-semibold',
              collapsed && 'board-title-short',
              titleOnly && !collapsed ? 'line-clamp-2 break-words' : 'truncate',
              editing && 'font-medium text-muted-foreground',
            )}
            data-testid="board-note-title"
          >
            {editing ? 'Editing' : title}
          </span>
          {/* The buttons: while editing, and otherwise over the end of the title on hover or once the card is
              selected (on a touch screen: tapped), so the title has the card's width the rest of the time */}
          <div
            className={cn(
              'flex shrink-0 items-center gap-0.5',
              !editing && 'absolute top-1/2 right-1 -translate-y-1/2 rounded-md bg-card/85 backdrop-blur-sm',
              !editing && !selected && 'hidden group-focus-within/board-card:flex group-hover/board-card:flex has-data-[state=open]:flex',
              titleOnly && 'hidden!',
            )}
          >
            {note &&
              (editing ? (
                <Button
                  variant="secondary"
                  size="icon-xs"
                  className="nodrag pointer-coarse:size-9"
                  aria-label="Finish editing"
                  onClick={() => board.setEditingId(null)}
                >
                  <Check />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="nodrag pointer-coarse:size-9"
                  aria-label={`Edit ${title}`}
                  onClick={() => board.editNote(id)}
                >
                  <Pencil />
                </Button>
              ))}
            <RowDropdownMenu
              align="end"
              entries={entries}
              trigger={
                <Button variant="ghost" size="icon-xs" className="nodrag pointer-coarse:size-9" aria-label={`Actions for ${title}`}>
                  <MoreHorizontal />
                </Button>
              }
            />
          </div>
        </div>
        {editing ? (
          // nodrag / nowheel / nopan: typing, selecting and scrolling must not move the card or the canvas.
          // Escape ends editing, except while the slash menu is open (then it just closes that menu). The
          // editor swallows Escape itself, so this listens before it (capture) and checks for the menu.
          <div
            data-testid="board-note-editor"
            className="nodrag nowheel nopan min-h-0 flex-1 overflow-y-auto"
            onKeyDownCapture={(e) => {
              if (e.key === 'Escape' && !document.querySelector('.bn-suggestion-menu')) board.setEditingId(null)
            }}
          >
            {board.renderEditor(note)}
          </div>
        ) : note ? (
          <NoteCardBody note={note} view={view} fill hideMeta={zoomedOut} className="px-3" />
        ) : (
          <p className="min-h-0 flex-1 overflow-hidden p-3 text-sm text-muted-foreground">This note was deleted.</p>
        )}
      </div>
    </>
  )
}

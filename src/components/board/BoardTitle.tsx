import { useEffect, useRef, useState } from 'react'
import { renameBoard, takeFreshBoard } from '@/db/boards'
import type { Board } from '@/db/schema'

/**
 * The board's name as a large headline in the top-left corner of the canvas, edited in place like a note's
 * title. It stays put while the canvas pans. A board you just created starts here with its name selected.
 */
export function BoardTitle({ board }: { board: Board }) {
  const [title, setTitle] = useState(board.title)
  const ref = useRef<HTMLInputElement>(null)

  // Follow renames made elsewhere (e.g. the sidebar) while not editing here
  useEffect(() => {
    if (document.activeElement !== ref.current) setTitle(board.title)
  }, [board.title])

  useEffect(() => {
    if (takeFreshBoard(board.id)) ref.current?.select()
  }, [board.id])

  return (
    <h1 className="m-0">
      <input
        ref={ref}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => void renameBoard(board.id, title)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') {
            setTitle(board.title)
            requestAnimationFrame(() => ref.current?.blur())
          }
        }}
        placeholder="Untitled board"
        aria-label="Board title"
        // As wide as the name (at most what the controls beside it leave), so the canvas around it stays usable.
        // On a phone, cards often pass under it: a soft backdrop keeps it readable.
        className="block max-w-[min(36rem,100%)] min-w-24 rounded-md bg-transparent px-1.5 py-0.5 font-page text-2xl leading-tight font-bold tracking-tight text-ellipsis outline-none [field-sizing:content] placeholder:text-muted-foreground hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring/60 max-sm:bg-background/80 max-sm:backdrop-blur-sm sm:text-4xl"
      />
    </h1>
  )
}

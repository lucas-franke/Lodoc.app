import { LayoutDashboard } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { renameBoard, takeFreshBoard } from '@/db/boards'
import type { Board } from '@/db/schema'

/**
 * "Boards › Title" (or the folder path for a board in a folder) with the title editable in place: boards are
 * full-bleed, so there is no page title.
 */
export function BoardBreadcrumb({ board }: { board: Board }) {
  const [title, setTitle] = useState(board.title)
  const ref = useRef<HTMLInputElement>(null)

  // Follow renames made elsewhere (e.g. the sidebar) while not editing here
  useEffect(() => {
    if (document.activeElement !== ref.current) setTitle(board.title)
  }, [board.title])

  // A board you just created starts with its name, like a new note
  useEffect(() => {
    if (takeFreshBoard(board.id)) ref.current?.select()
  }, [board.id])

  const titleInput = (
    <>
      {/* Not <BreadcrumbPage>: it is marked aria-disabled, which would disable the input for screen readers */}
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
        size={Math.max(title.length, 14)}
        className="h-8 max-w-64 min-w-0 rounded-md bg-transparent px-1.5 text-sm outline-none placeholder:text-muted-foreground hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/60"
      />
    </>
  )

  if (board.folderId) return <Breadcrumbs folderId={board.folderId} current={titleInput} />

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap">
        <BreadcrumbItem>
          <span className="flex items-center gap-1.5 px-1.5 py-0.5">
            <LayoutDashboard className="size-3.5 shrink-0" />
            Boards
          </span>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem className="min-w-0">
          {titleInput}
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}

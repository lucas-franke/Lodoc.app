import { LayoutDashboard } from 'lucide-react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { boardTitle } from '@/db/boards'
import type { Board } from '@/db/schema'

/**
 * "Boards › Title" (or the folder path for a board in a folder). The name is edited in the large title on the
 * canvas (BoardTitle), like a note's.
 */
export function BoardBreadcrumb({ board }: { board: Board }) {
  const title = <span className="block max-w-64 truncate px-1.5">{boardTitle(board)}</span>

  if (board.folderId) return <Breadcrumbs folderId={board.folderId} current={title} />

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
          <span aria-current="page">{title}</span>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}

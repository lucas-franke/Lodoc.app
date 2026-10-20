import { BookOpen, BookText, ChevronDown, Info, Keyboard, Sparkles } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { openNote } from '@/hooks/useRoute'
import { emitAppEvent } from '@/lib/app-events'
import { formatDate } from '@/lib/format'
import { openGuideNote } from '@/lib/guide'

const release = __LODOC_RELEASE__

/**
 * "Lodoc ⌄" at the top of the sidebar: the website's pages (docs, the changelog and the about page), help
 * inside the app, and which version this is. The pages sit beside the app ("./changelog/"), so the links work on
 * lodoc.app and on GitHub Pages alike; in the installed app they open in its window.
 */
export function LodocMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex min-w-0 items-center gap-1 rounded-md px-1.5 py-1 text-sm font-semibold tracking-tight outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring/60 data-[state=open]:bg-sidebar-accent"
        >
          <span className="truncate">Lodoc</span>
          <ChevronDown aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuItem asChild>
          <a href="./docs/">
            <BookText /> Docs
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href="./changelog/">
            <Sparkles /> What's new
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href="./about/">
            <Info /> About Lodoc
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={async () => openNote(await openGuideNote())}>
          <BookOpen /> Getting started guide
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => emitAppEvent('open-shortcuts')}>
          <Keyboard /> Keyboard shortcuts
          <DropdownMenuShortcut>?</DropdownMenuShortcut>
        </DropdownMenuItem>
        {release.version && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Lodoc {release.version} · {formatDate(new Date(release.date))}
            </DropdownMenuLabel>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

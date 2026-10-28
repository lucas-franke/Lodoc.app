import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useWideScreen } from '@/hooks/useWideScreen'
import { isTouchScreen } from '@/lib/keyboard'

export type MenuEntry =
  | { type: 'item'; label: string; icon?: LucideIcon; onSelect: () => void; destructive?: boolean; indent?: number }
  | { type: 'separator' }
  | { type: 'sub'; label: string; icon?: LucideIcon; entries: MenuEntry[] }

/** What a menu shows: its entries, and the name of a submenu laid out inline (see `inlineSubmenus`) */
type ShownEntry = MenuEntry | { type: 'label'; label: string; icon?: LucideIcon }

const parts = {
  context: {
    Item: ContextMenuItem,
    Label: ContextMenuLabel,
    Separator: ContextMenuSeparator,
    Sub: ContextMenuSub,
    SubTrigger: ContextMenuSubTrigger,
    SubContent: ContextMenuSubContent,
  },
  dropdown: {
    Item: DropdownMenuItem,
    Label: DropdownMenuLabel,
    Separator: DropdownMenuSeparator,
    Sub: DropdownMenuSub,
    SubTrigger: DropdownMenuSubTrigger,
    SubContent: DropdownMenuSubContent,
  },
}

/**
 * Drops what would be useless or look odd when entries are left out conditionally: submenus with
 * nothing in them, and separators at the start, at the end or twice in a row.
 */
function tidyEntries<T extends ShownEntry>(entries: T[]): T[] {
  const out: T[] = []
  for (const entry of entries) {
    if (entry.type === 'sub' && tidyEntries(entry.entries).length === 0) continue
    if (entry.type === 'separator' && (out.length === 0 || out[out.length - 1].type === 'separator')) continue
    out.push(entry)
  }
  while (out.length && out[out.length - 1].type === 'separator') out.pop()
  return out
}

/**
 * Narrow screens have no room for a submenu beside the menu (on a phone "Move to" opened off the screen), so
 * a submenu's entries follow inline there: set apart by separators, under its name, indented one step.
 */
function inlineSubmenus(entries: MenuEntry[]): ShownEntry[] {
  return entries.flatMap((entry): ShownEntry[] =>
    entry.type === 'sub'
      ? [
          { type: 'separator' },
          { type: 'label', label: entry.label, icon: entry.icon },
          ...entry.entries.map((e) => (e.type === 'item' ? { ...e, indent: (e.indent ?? 0) + 1 } : e)),
          { type: 'separator' },
        ]
      : [entry],
  )
}

function Entries({ entries: rawEntries, kind }: { entries: MenuEntry[]; kind: keyof typeof parts }) {
  const P = parts[kind]
  const wide = useWideScreen()
  const entries = tidyEntries(wide ? rawEntries : inlineSubmenus(rawEntries))
  return entries.map((entry, i) => {
    if (entry.type === 'separator') return <P.Separator key={i} />
    if (entry.type === 'label') {
      return (
        <P.Label key={i} className="flex items-center gap-1.5 [&_svg]:size-(--icon-sm)">
          {entry.icon && <entry.icon aria-hidden />}
          {entry.label}
        </P.Label>
      )
    }
    if (entry.type === 'sub') {
      return (
        <P.Sub key={i}>
          <P.SubTrigger>
            {entry.icon && <entry.icon />}
            {entry.label}
          </P.SubTrigger>
          <P.SubContent className="max-h-80 overflow-y-auto">
            <Entries entries={entry.entries} kind={kind} />
          </P.SubContent>
        </P.Sub>
      )
    }
    return (
      <P.Item
        key={i}
        variant={entry.destructive ? 'destructive' : 'default'}
        onSelect={entry.onSelect}
        style={entry.indent ? { paddingLeft: `${0.5 + entry.indent * 0.75}rem` } : undefined}
      >
        {entry.icon && <entry.icon />}
        {entry.label}
      </P.Item>
    )
  })
}

/**
 * Menus return focus to their trigger when closing. Skip that when the chosen action already
 * moved focus into a text field (e.g. an inline rename input), or it would be blurred right away.
 */
function keepMovedFocus(event: Event) {
  const el = document.activeElement as HTMLElement | null
  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) event.preventDefault()
}

/**
 * On touch screens the menus don't trap focus: "Rename" focuses a text field while the menu is still open
 * (see holdKeyboard), and a trapped menu would pull focus back, so the keyboard wouldn't open.
 */
const modal = () => !isTouchScreen()

/** Wraps a row with a right-click menu; the same entries can be shown in a "…" dropdown. */
export function RowContextMenu({ entries, children }: { entries: MenuEntry[]; children: ReactNode }) {
  return (
    <ContextMenu modal={modal()}>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56" onCloseAutoFocus={keepMovedFocus}>
        <Entries entries={entries} kind="context" />
      </ContextMenuContent>
    </ContextMenu>
  )
}

export function RowDropdownMenu({
  entries,
  trigger,
  align = 'start',
}: {
  entries: MenuEntry[]
  trigger: ReactNode
  align?: 'start' | 'end'
}) {
  return (
    <DropdownMenu modal={modal()}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-56" onCloseAutoFocus={keepMovedFocus}>
        <Entries entries={entries} kind="dropdown" />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

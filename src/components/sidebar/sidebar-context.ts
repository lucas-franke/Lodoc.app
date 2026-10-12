import { SquareCheck, SquareX } from 'lucide-react'
import { createContext, useContext } from 'react'
import type { MenuEntry } from '@/components/ItemMenu'
import type { Board, Folder, Note } from '@/db/schema'

export interface SidebarContextValue {
  folders: Folder[]
  /** Notes per folder (null = not in a folder), each list already in display order */
  notesByFolder: Map<string | null, Note[]>
  /** Boards per folder (null = top level), newest first */
  boardsByFolder: Map<string | null, Board[]>
  activeNoteId: string | null
  activeFolderId: string | null
  activeBoardId: string | null
  expanded: Set<string>
  toggleExpanded: (id: string, open?: boolean) => void
  renamingId: string | null
  setRenamingId: (id: string | null) => void
  /** Selected rows, by key ("note:<id>", "folder:<id>", "board:<id>") */
  selected: Set<string>
  toggleSelected: (key: string) => void
  /** Click on a row's link: Ctrl/⌘ toggles, Shift selects a range (both instead of opening); a plain click clears the selection */
  selectClick: (e: React.MouseEvent, key: string) => void
}

export const SidebarContext = createContext<SidebarContextValue | null>(null)

export function useSidebar() {
  const ctx = useContext(SidebarContext)
  if (!ctx) throw new Error('useSidebar must be used inside <Sidebar>')
  return ctx
}

/** The row menu plus "Select" / "Deselect" (the keyboard way to multi-select), just above Delete */
export function withSelectEntry(entries: MenuEntry[], selected: boolean, toggle: () => void): MenuEntry[] {
  const entry: MenuEntry = { type: 'item', label: selected ? 'Deselect' : 'Select', icon: selected ? SquareX : SquareCheck, onSelect: toggle }
  const at = entries.findLastIndex((e) => e.type === 'separator')
  return at < 0 ? [...entries, entry] : [...entries.slice(0, at), entry, ...entries.slice(at)]
}

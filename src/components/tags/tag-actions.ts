import { Pencil, Trash2 } from 'lucide-react'
import type { MenuEntry } from '@/components/ItemMenu'
import { removeTag, restoreTag } from '@/db/tags'
import { openTag } from '@/hooks/useRoute'
import { emitAppEvent } from '@/lib/app-events'
import { plural } from '@/lib/format'
import { holdKeyboard } from '@/lib/keyboard'
import { notify } from '@/lib/notify'

// A tag's actions: the same menu on its page (⋯) and on its row in the sidebar (right-click, press and hold).

// Renaming happens on the tag's page, in its title. From the sidebar the page is opened first, and it starts
// renaming once it is there (or right away, if it is the open page).
let pendingRename: string | null = null

/** True once after `requestTagRename` for this tag */
export function takeTagRename(tag: string) {
  if (pendingRename !== tag) return false
  pendingRename = null
  return true
}

function requestTagRename(tag: string) {
  pendingRename = tag
  openTag(tag)
  emitAppEvent('rename-tag', tag)
}

/** `onRename`: where the name can be edited in place (the tag's page); elsewhere the page is opened for it */
export function tagMenuEntries(tag: string, onRename?: () => void): MenuEntry[] {
  return [
    {
      type: 'item',
      label: 'Rename',
      icon: Pencil,
      onSelect: () => {
        holdKeyboard()
        if (onRename) onRename()
        else requestTagRename(tag)
      },
    },
    { type: 'separator' },
    {
      type: 'item',
      label: 'Remove from all notes',
      icon: Trash2,
      destructive: true,
      // No question first: the message offers Undo, like deleting a note
      onSelect: async () => {
        const before = await removeTag(tag)
        if (!before.length) return
        notify(`Removed #${tag} from ${plural(before.length, 'note')}`, {
          logged: true,
          action: { label: 'Undo', onClick: () => void restoreTag(tag, before) },
        })
      },
    },
  ]
}

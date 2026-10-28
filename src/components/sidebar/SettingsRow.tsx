import { Settings } from 'lucide-react'
import { useEffect, useState } from 'react'
import { emitAppEvent } from '@/lib/app-events'

/** The sidebar footer's way into Settings, above Backup; it stays highlighted while Settings is open */
export function SettingsRow() {
  const open = useSettingsOpen()
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-keyshortcuts="Control+Comma"
      onClick={() => emitAppEvent('open-settings')}
      className="flex min-h-11 w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring/60 aria-expanded:bg-sidebar-accent"
    >
      <Settings aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate">Settings</span>
    </button>
  )
}

/** Whether the Settings panel is open (SettingsHost marks <html> with data-settings-open) */
function useSettingsOpen() {
  const root = document.documentElement
  const [open, setOpen] = useState(() => root.hasAttribute('data-settings-open'))
  useEffect(() => {
    const observer = new MutationObserver(() => setOpen(root.hasAttribute('data-settings-open')))
    observer.observe(root, { attributeFilter: ['data-settings-open'] })
    return () => observer.disconnect()
  }, [root])
  return open
}

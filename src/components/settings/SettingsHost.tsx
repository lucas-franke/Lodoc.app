import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import type { SettingsTab } from '@/components/settings/SettingsPanel'
import { useAppEvent } from '@/lib/app-events'

// The panel (and its slider/switch/toggle components) is only loaded once it is opened
const SettingsPanel = lazy(() => import('@/components/settings/SettingsPanel').then((m) => ({ default: m.SettingsPanel })))

/**
 * Holds the Settings panel. It opens from the sidebar, the Lodoc menu, the Backup menu, the command palette
 * and Ctrl+, via the "open-settings" event, optionally with a tab ({ tab: 'backup' }).
 */
export function SettingsHost() {
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  // Opens on the tab used last, unless one is asked for
  const [tab, setTab] = useState<SettingsTab>('appearance')
  // Focus goes back where it was (e.g. the sidebar row), since the panel has no trigger of its own
  const opener = useRef<HTMLElement | null>(null)

  useAppEvent(
    'open-settings',
    useCallback((detail?: unknown) => {
      opener.current = document.activeElement as HTMLElement | null
      const asked = (detail as { tab?: SettingsTab } | undefined)?.tab
      if (asked) setTab(asked)
      setLoaded(true)
      setOpen(true)
    }, []),
  )

  // Lets the page make room for the panel on wide screens (index.css), and the sidebar row show it is open
  useEffect(() => {
    document.documentElement.toggleAttribute('data-settings-open', open)
    return () => document.documentElement.removeAttribute('data-settings-open')
  }, [open])

  return loaded ? (
    <Suspense fallback={null}>
      <SettingsPanel
        open={open}
        onOpenChange={setOpen}
        tab={tab}
        onTabChange={setTab}
        returnFocus={() => opener.current?.isConnected && opener.current.focus()}
      />
    </Suspense>
  ) : null
}

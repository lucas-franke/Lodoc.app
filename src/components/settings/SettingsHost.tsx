import { useCallback, useEffect, useRef, useState } from 'react'
import type { SettingsPanel as SettingsPanelType, SettingsTab } from '@/components/settings/SettingsPanel'
import { loadSettingsPanel } from '@/components/settings/load-settings'
import { useAppEvent } from '@/lib/app-events'

/**
 * Holds the Settings window. It opens from the sidebar, the Lodoc menu, the Backup menu, the command palette
 * and Ctrl+, via the "open-settings" event, optionally with a tab ({ tab: 'backup' }).
 *
 * The panel is its own chunk, fetched when the app is idle (or on the way in). It is kept in state rather than
 * rendered through lazy/Suspense: Suspense holds back newly shown content for about 300 ms, which made
 * the first opening feel slow even when the chunk was already there.
 */
export function SettingsHost() {
  const [open, setOpen] = useState(false)
  const [Panel, setPanel] = useState<typeof SettingsPanelType | null>(null)
  // Opens on the tab used last, unless one is asked for
  const [tab, setTab] = useState<SettingsTab>('appearance')
  // Focus goes back where it was (e.g. the sidebar row), since the panel has no trigger of its own
  const opener = useRef<HTMLElement | null>(null)

  const load = useCallback(
    () => loadSettingsPanel().then((m) => setPanel(() => m.SettingsPanel)),
    [],
  )

  useAppEvent(
    'open-settings',
    useCallback(
      (detail?: unknown) => {
        opener.current = document.activeElement as HTMLElement | null
        const asked = (detail as { tab?: SettingsTab } | undefined)?.tab
        if (asked) setTab(asked)
        // Usually loaded already; otherwise it opens as soon as it arrives
        void load().then(() => setOpen(true))
      },
      [load],
    ),
  )

  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((fn: () => void) => window.setTimeout(fn, 1500))
    idle(() => void load())
  }, [load])

  // Lets the sidebar row show that Settings is open
  useEffect(() => {
    document.documentElement.toggleAttribute('data-settings-open', open)
    return () => document.documentElement.removeAttribute('data-settings-open')
  }, [open])

  return Panel ? (
    <Panel
      open={open}
      onOpenChange={setOpen}
      tab={tab}
      onTabChange={setTab}
      returnFocus={() => opener.current?.isConnected && opener.current.focus()}
    />
  ) : null
}

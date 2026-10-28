import { useEffect } from 'react'
import type { SettingsView } from '@/components/settings/SettingsView'

// Settings (and its slider/switch/toggle components) is its own chunk. It is fetched once the app is idle after
// starting, or when the pointer or focus reaches a way in, so opening it doesn't wait for the download.
let loaded: typeof SettingsView | null = null

export const loadSettings = () =>
  import('@/components/settings/SettingsView').then((m) => {
    loaded = m.SettingsView
    return m.SettingsView
  })

/** The page's component once it has arrived (null before) */
export const loadedSettings = () => loaded

export const preloadSettings = () => void loadSettings()

/** Fetches the Settings chunk once the app is idle, so the first visit doesn't wait for it */
export function usePreloadSettings() {
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((fn: () => void) => window.setTimeout(fn, 1500))
    idle(preloadSettings)
  }, [])
}

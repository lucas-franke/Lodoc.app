import { useEffect, useState } from 'react'
import { loadedSettings, loadSettings } from '@/components/settings/load-settings'
import type { SettingsTab } from '@/hooks/useRoute'

/**
 * The Settings page (#/settings/<tab>). Its chunk is usually there already (fetched when the app is idle, or on
 * the way in), and the component is kept in state rather than rendered through lazy/Suspense: Suspense holds
 * back newly shown content for about 300 ms, which made opening it feel slow even with the chunk loaded.
 */
export function SettingsPage({ tab }: { tab: SettingsTab }) {
  const [View, setView] = useState(loadedSettings)
  useEffect(() => {
    if (!View) void loadSettings().then((v) => setView(() => v))
  }, [View])
  return View ? <View tab={tab} /> : null
}


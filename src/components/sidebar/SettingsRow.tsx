import { Settings } from 'lucide-react'
import { preloadSettings } from '@/components/settings/load-settings'
import { settingsHash, useSettingsTab } from '@/hooks/useRoute'
import { rowClass, rowLinkClass } from './row-styles'

/** The sidebar footer's way into Settings, above Backup; a page like Activity, marked while it is open */
export function SettingsRow() {
  const onSettings = useSettingsTab() !== null
  return (
    <div className={rowClass(onSettings)}>
      <a
        href={settingsHash()}
        aria-current={onSettings ? 'page' : undefined}
        aria-keyshortcuts="Control+Comma"
        onPointerEnter={preloadSettings}
        onFocus={preloadSettings}
        className={rowLinkClass}
        style={{ paddingLeft: '0.5rem' }}
      >
        <Settings aria-hidden className="size-(--icon) shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate">Settings</span>
      </a>
    </div>
  )
}

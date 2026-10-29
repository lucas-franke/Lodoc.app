import { ArchiveRestore, Palette } from 'lucide-react'
import type { ComponentType } from 'react'
import { BackLink } from '@/components/BackLink'
import { UniversalAccess } from '@/components/icons/UniversalAccess'
import { AccessibilitySettings } from '@/components/settings/AccessibilitySettings'
import { AppearanceSettings } from '@/components/settings/AppearanceSettings'
import { BackupSettings } from '@/components/settings/BackupSettings'
import { useEscapeToLeave } from '@/hooks/useEscapeToLeave'
import { settingsHash, type SettingsTab } from '@/hooks/useRoute'
import { cn } from '@/lib/utils'

const TABS: { id: SettingsTab; title: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: 'appearance', title: 'Appearance', icon: Palette },
  { id: 'accessibility', title: 'Accessibility', icon: UniversalAccess },
  { id: 'backup', title: 'Backup', icon: ArchiveRestore },
]

/**
 * Settings, as a page like Activity: Appearance, Accessibility and Backup as tabs (links, so Back walks
 * through them). The app around it shows each change at once; "Back to …" (or Escape) returns to where you
 * came from.
 */
export function SettingsView({ tab }: { tab: SettingsTab }) {
  useEscapeToLeave('settings')

  return (
    <div className="mx-auto w-full max-w-3xl px-6 pt-12 pb-24 max-sm:pt-6 sm:px-12">
      <BackLink section="settings" />
      <h1 className="font-page text-4xl font-bold tracking-tight max-sm:text-3xl">Settings</h1>
      <nav aria-label="Settings" data-focus-inset className="mt-6 flex gap-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none]">
        {TABS.map(({ id, title, icon: Icon }) => (
          <a
            key={id}
            href={settingsHash(id)}
            aria-current={id === tab ? 'page' : undefined}
            className={cn(
              'flex shrink-0 items-center gap-2 border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60',
              id === tab && 'border-foreground font-medium text-foreground',
            )}
          >
            {/* Icons only where there is room for all three tabs with them */}
            <Icon aria-hidden className="size-(--icon) shrink-0 max-sm:hidden" />
            {title}
          </a>
        ))}
      </nav>
      <div className="mt-8">
        {tab === 'appearance' && <AppearanceSettings />}
        {tab === 'accessibility' && <AccessibilitySettings />}
        {tab === 'backup' && <BackupSettings />}
      </div>
    </div>
  )
}

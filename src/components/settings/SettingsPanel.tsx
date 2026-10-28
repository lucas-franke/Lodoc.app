import { ArchiveRestore, Palette } from 'lucide-react'
import { useRef, type ComponentType, type KeyboardEvent } from 'react'
import { UniversalAccess } from '@/components/icons/UniversalAccess'
import { AccessibilitySettings } from '@/components/settings/AccessibilitySettings'
import { AppearanceSettings } from '@/components/settings/AppearanceSettings'
import { BackupSettings } from '@/components/settings/BackupSettings'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

export type SettingsTab = 'appearance' | 'accessibility' | 'backup'

const TABS: { id: SettingsTab; title: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: 'appearance', title: 'Appearance', icon: Palette },
  { id: 'accessibility', title: 'Accessibility', icon: UniversalAccess },
  { id: 'backup', title: 'Backup', icon: ArchiveRestore },
]

/**
 * Settings: a panel on the right, beside the page, with a tab each for Appearance, Accessibility and Backup.
 * The three are unrelated, so tabs keep each short; Appearance itself stays one column, so looks can be
 * combined while the page shows them.
 */
export function SettingsPanel({
  open,
  onOpenChange,
  tab,
  onTabChange,
  returnFocus,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  tab: SettingsTab
  onTabChange: (tab: SettingsTab) => void
  /** Where focus goes back to when the panel closes (it is opened from outside, without a trigger) */
  returnFocus: () => void
}) {
  const list = useRef<HTMLDivElement>(null)
  // Arrow keys, Home and End move between the tabs (and select them)
  const onKeyDown = (e: KeyboardEvent) => {
    const index = TABS.findIndex((t) => t.id === tab)
    const next =
      e.key === 'ArrowRight' ? (index + 1) % TABS.length
      : e.key === 'ArrowLeft' ? (index - 1 + TABS.length) % TABS.length
      : e.key === 'Home' ? 0
      : e.key === 'End' ? TABS.length - 1
      : null
    if (next === null) return
    e.preventDefault()
    onTabChange(TABS[next].id)
    list.current?.querySelectorAll<HTMLElement>('[role=tab]')[next]?.focus()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        overlayClassName="bg-transparent supports-backdrop-filter:backdrop-blur-none"
        className="gap-0 safe-area-padding-y data-[side=right]:w-full sm:data-[side=right]:w-[440px] data-[side=right]:sm:max-w-[440px] floating:inset-y-2 floating:right-2 floating:h-auto floating:overflow-hidden floating:rounded-xl floating:border floating:shadow-lg max-sm:floating:left-2 max-sm:floating:w-auto"
        onCloseAutoFocus={(e) => {
          e.preventDefault()
          returnFocus()
        }}
      >
        <SheetHeader className="pb-2">
          <SheetTitle>Settings</SheetTitle>
          <SheetDescription>Saved in this browser</SheetDescription>
        </SheetHeader>

        <div ref={list} role="tablist" aria-label="Settings" onKeyDown={onKeyDown} className="flex gap-1 border-b px-2">
          {TABS.map(({ id, title, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`settings-tab-${id}`}
              aria-selected={tab === id}
              aria-controls="settings-tabpanel"
              tabIndex={tab === id ? 0 : -1}
              onClick={() => onTabChange(id)}
              className={cn(
                // The chosen tab: an underline in the text color and medium weight, not color alone
                'relative flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-t-md px-2 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                'aria-selected:font-medium aria-selected:text-foreground aria-selected:after:absolute aria-selected:after:inset-x-2 aria-selected:after:-bottom-px aria-selected:after:h-0.5 aria-selected:after:rounded-full aria-selected:after:bg-foreground',
              )}
            >
              <Icon aria-hidden className="size-4 shrink-0" />
              {title}
            </button>
          ))}
        </div>

        <div role="tabpanel" id="settings-tabpanel" aria-labelledby={`settings-tab-${tab}`} className="flex min-h-0 flex-1 flex-col">
          {tab === 'appearance' && <AppearanceSettings />}
          {tab === 'accessibility' && <AccessibilitySettings />}
          {tab === 'backup' && <BackupSettings />}
        </div>
      </SheetContent>
    </Sheet>
  )
}

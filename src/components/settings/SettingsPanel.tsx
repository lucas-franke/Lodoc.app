import { ArchiveRestore, Palette } from 'lucide-react'
import { useRef, type ComponentType, type KeyboardEvent } from 'react'
import { UniversalAccess } from '@/components/icons/UniversalAccess'
import { AccessibilitySettings } from '@/components/settings/AccessibilitySettings'
import { AppearanceSettings } from '@/components/settings/AppearanceSettings'
import { BackupSettings } from '@/components/settings/BackupSettings'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export type SettingsTab = 'appearance' | 'accessibility' | 'backup'

const TABS: { id: SettingsTab; title: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: 'appearance', title: 'Appearance', icon: Palette },
  { id: 'accessibility', title: 'Accessibility', icon: UniversalAccess },
  { id: 'backup', title: 'Backup', icon: ArchiveRestore },
]

/**
 * Settings: a window in the middle with its sections on the left (a row of tabs on a phone), for Appearance,
 * Accessibility and Backup. The three are unrelated, so each has its own view; Appearance itself stays one
 * column under a live preview, so looks can be combined.
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
  /** Where focus goes back to when Settings closes (it is opened from outside, without a trigger) */
  returnFocus: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        // A light dim without blur, so the page behind still shows each change
        overlayClassName="bg-black/20 supports-backdrop-filter:backdrop-blur-none"
        onCloseAutoFocus={(e) => {
          e.preventDefault()
          returnFocus()
        }}
        className="flex h-[min(48rem,calc(100dvh-2rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-[54rem] max-sm:inset-0 max-sm:h-dvh max-sm:max-w-none max-sm:translate-0 max-sm:rounded-none max-sm:safe-area-padding-y"
      >
        <div className="border-b px-5 pt-4 pb-3">
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription className="mt-1">Saved in this browser</DialogDescription>
        </div>

        <div className="flex min-h-0 flex-1 max-sm:flex-col">
          <SectionTabs value={tab} onChange={onTabChange} orientation="vertical" className="hidden w-48 shrink-0 border-r p-2 sm:flex" />
          <SectionTabs value={tab} onChange={onTabChange} orientation="horizontal" className="border-b px-2 sm:hidden" />

          <div role="tabpanel" id="settings-tabpanel" aria-labelledby={`settings-tab-${tab}`} className="flex min-h-0 min-w-0 flex-1 flex-col">
            {tab === 'appearance' && <AppearanceSettings />}
            {tab === 'accessibility' && <AccessibilitySettings />}
            {tab === 'backup' && <BackupSettings />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** The sections: down the side on wide screens, a row of tabs on a phone (arrow keys, Home and End move between them) */
function SectionTabs({
  value,
  onChange,
  orientation,
  className,
}: {
  value: SettingsTab
  onChange: (tab: SettingsTab) => void
  orientation: 'vertical' | 'horizontal'
  className?: string
}) {
  const list = useRef<HTMLDivElement>(null)
  const vertical = orientation === 'vertical'
  const onKeyDown = (e: KeyboardEvent) => {
    const index = TABS.findIndex((t) => t.id === value)
    const step = { [vertical ? 'ArrowDown' : 'ArrowRight']: 1, [vertical ? 'ArrowUp' : 'ArrowLeft']: -1 }[e.key]
    const next = step
      ? (index + step + TABS.length) % TABS.length
      : e.key === 'Home'
        ? 0
        : e.key === 'End'
          ? TABS.length - 1
          : null
    if (next === null) return
    e.preventDefault()
    onChange(TABS[next].id)
    list.current?.querySelectorAll<HTMLElement>('[role=tab]')[next]?.focus()
  }
  return (
    <div
      ref={list}
      role="tablist"
      aria-label="Settings"
      aria-orientation={orientation}
      onKeyDown={onKeyDown}
      className={cn(vertical ? 'flex-col gap-0.5' : 'flex gap-1', className)}
    >
      {TABS.map(({ id, title, icon: Icon }) => (
        <button
          key={id}
          type="button"
          role="tab"
          // Only one of the two lists shows at a time (the other is display: none), so the ids don't clash
          id={vertical ? `settings-tab-${id}` : undefined}
          aria-selected={value === id}
          aria-controls="settings-tabpanel"
          tabIndex={value === id ? 0 : -1}
          onClick={() => onChange(id)}
          className={cn(
            'flex items-center gap-2 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring aria-selected:font-medium aria-selected:text-foreground',
            vertical
              ? // The chosen section: the accent fill and a bar in the text color on its left, not color alone
                'relative min-h-9 w-full rounded-md px-2.5 text-left hover:bg-accent/60 aria-selected:bg-accent aria-selected:before:absolute aria-selected:before:inset-y-2 aria-selected:before:left-0 aria-selected:before:w-0.5 aria-selected:before:rounded-full aria-selected:before:bg-foreground'
              : // On a phone: an underline in the text color
                'relative min-h-11 flex-1 justify-center rounded-t-md px-2 focus-visible:ring-inset aria-selected:after:absolute aria-selected:after:inset-x-2 aria-selected:after:-bottom-px aria-selected:after:h-0.5 aria-selected:after:rounded-full aria-selected:after:bg-foreground',
          )}
        >
          <Icon aria-hidden className="size-4 shrink-0" />
          {title}
        </button>
      ))}
    </div>
  )
}

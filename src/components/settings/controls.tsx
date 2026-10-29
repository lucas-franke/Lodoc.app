import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { TEXTURE_STRENGTH_DEFAULT } from '@/lib/appearance'
import { cn } from '@/lib/utils'

// The building blocks of the Settings tabs, one pattern for the whole page: a section title, then each option with
// its label above (14 px medium, a hint below it) and its control under it. Every choice is a row of the same chips
// (a radio dot, a small icon, the name); on/off settings are a switch beside their label. Every control has an
// outline of at least 3:1 against the panel (--control-border, WCAG 1.4.11).

/** A tab's own actions (Appearance: Randomize), at its top right */
export function SettingsToolbar({ children }: { children: ReactNode }) {
  return <div className="-mt-3 mb-5 flex flex-wrap items-center justify-end gap-2">{children}</div>
}

export function SectionBlock({
  icon: Icon,
  title,
  hint,
  onReset,
  last = false,
  children,
}: {
  icon: LucideIcon
  title: string
  hint?: string
  /** Shown only when the section differs from the defaults */
  onReset?: () => void
  last?: boolean
  children: ReactNode
}) {
  return (
    <section aria-label={title}>
      <div className="mb-5 flex min-h-8 items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <Icon aria-hidden className="size-(--icon) text-muted-foreground" />
            {title}
          </h3>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
        {onReset && (
          <Button variant="ghost" size="xs" onClick={onReset} aria-label={`Reset ${title}`}>
            Reset
          </Button>
        )}
      </div>
      <div className="space-y-6">{children}</div>
      {!last && <Separator className="my-8" />}
    </section>
  )
}

/** One option: its label (and a hint) above, its control below */
export function OptionGroup({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="space-y-0.5">
        <div className="text-sm font-medium">{label}</div>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

/**
 * A choice of a few options, all as the same chip: a radio dot (filled on the chosen one, so the choice shows without
 * relying on color), a small icon that previews the option, and its name. The chips wrap on narrow screens. The
 * name keeps its weight when chosen, so a chip doesn't change width.
 */
export function Choice<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: T
  onChange: (value: T) => void
  options: { value: T; name: ReactNode; icon?: ReactNode; ariaLabel?: string }[]
}) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as T)}
      aria-label={label}
      spacing={2}
      className="w-full flex-wrap justify-start"
    >
      {options.map((o) => {
        const chosen = o.value === value
        return (
          <ToggleGroupItem
            key={o.value}
            value={o.value}
            aria-label={o.ariaLabel}
            className="h-10 shrink-0 gap-2 rounded-lg border border-control-border bg-background px-3 text-sm font-normal hover:bg-accent/60 data-[state=on]:border-foreground data-[state=on]:bg-accent pointer-coarse:h-11"
          >
            <span
              aria-hidden
              className={cn(
                'flex size-3.5 shrink-0 items-center justify-center rounded-full border',
                chosen ? 'border-foreground' : 'border-control-border',
              )}
            >
              {chosen && <span className="size-2 rounded-full bg-foreground" />}
            </span>
            {o.icon && (
              <span aria-hidden className="flex h-5 min-w-5 items-center justify-center text-foreground/80 [&_svg]:size-4">
                {o.icon}
              </span>
            )}
            <span>{o.name}</span>
          </ToggleGroupItem>
        )
      })}
    </ToggleGroup>
  )
}

/** An on/off setting: its label (and hint) on the left, the switch beside it */
export function SwitchRow({
  id,
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  id: string
  label: string
  hint?: ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-0.5">
        <Label htmlFor={id} className="leading-normal">
          {label}
        </Label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {/* An outlined track and a solid knob when off, so the switch and its state show at 3:1 or more */}
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        className="data-unchecked:border-control-border data-unchecked:bg-muted dark:data-unchecked:bg-muted data-unchecked:**:data-[slot=switch-thumb]:bg-foreground/70"
      />
    </div>
  )
}

/** 0–100 %, with a dot marking the default (50 %, each texture's tuned strength) */
export function StrengthSlider({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <Slider
      thumbLabel={label}
      thumbValueText={`${value} %`}
      min={0}
      max={100}
      step={5}
      marker={TEXTURE_STRENGTH_DEFAULT}
      value={[value]}
      onValueChange={([v]) => onChange(v)}
      className="h-6 [--slider-thumb:1.5rem] **:data-[slot=slider-range]:bg-transparent **:data-[slot=slider-thumb]:size-(--slider-thumb) **:data-[slot=slider-thumb]:border-foreground/70 **:data-[slot=slider-thumb]:shadow-md **:data-[slot=slider-track]:h-6! **:data-[slot=slider-track]:border **:data-[slot=slider-track]:border-control-border **:data-[slot=slider-track]:bg-[color-mix(in_oklab,var(--muted)_60%,var(--background))]"
    />
  )
}

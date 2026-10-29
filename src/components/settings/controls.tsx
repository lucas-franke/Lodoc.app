import { Check, type LucideIcon } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { TEXTURE_STRENGTH_DEFAULT } from '@/lib/appearance'
import { cn } from '@/lib/utils'

// The building blocks of the Settings tabs. Every option is a row with one kind of label (14 px, a hint below it),
// under section titles one step larger. Every control has an outline of at least 3:1 against the panel
// (--control-border, WCAG 1.4.11), and a chosen option is filled in the text color.

/**
 * How a chosen option looks: filled in the text color, its label in the page color (black in light mode, white in
 * dark). Clear at a glance, without a heavy outline around it. Previews in tiles draw in currentColor.
 */
export const SELECTED_CLASSES =
  'border-control-border hover:bg-accent/60 focus-visible:border-control-border data-[state=on]:border-foreground data-[state=on]:bg-foreground data-[state=on]:font-medium data-[state=on]:text-background data-[state=on]:hover:bg-foreground data-[state=on]:hover:text-background'

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
      <div className="mb-4 flex min-h-8 items-start justify-between gap-2">
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
      <div className="space-y-5">{children}</div>
      {!last && <Separator className="my-6" />}
    </section>
  )
}

/**
 * One option: its name (and a hint) on the left and its control on the right, or, `stacked`, the control below
 * (picture tiles that need the width). On a narrow screen the control wraps below the name.
 */
export function Row({ label, hint, stacked = false, children }: { label: string; hint?: ReactNode; stacked?: boolean; children: ReactNode }) {
  return (
    <div className={cn('flex gap-x-4 gap-y-2', stacked ? 'flex-col' : 'flex-wrap items-center justify-between')}>
      <div className="min-w-0 space-y-0.5">
        <div className="text-sm">{label}</div>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

/** A few choices that need no picture, side by side; the chosen one is filled */
export function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: T
  onChange: (value: T) => void
  options: { value: T; name: ReactNode; ariaLabel?: string; style?: CSSProperties }[]
}) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as T)}
      aria-label={label}
      spacing={0}
      className="max-w-full flex-wrap gap-0.5 rounded-lg border border-control-border p-0.5"
    >
      {options.map((o) => (
        <ToggleGroupItem
          key={o.value}
          value={o.value}
          aria-label={o.ariaLabel}
          style={o.style}
          className="h-8 gap-1.5 rounded-md px-3 font-normal text-muted-foreground hover:bg-accent/60 data-[state=on]:bg-foreground data-[state=on]:font-medium data-[state=on]:text-background data-[state=on]:hover:bg-foreground data-[state=on]:hover:text-background pointer-coarse:h-10 [&_svg:not([class*='size-'])]:size-4"
        >
          {o.name}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

/** One row of choices, all in the same tile style: a small preview on top, the name below */
export function Tiles<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: T
  onChange: (value: T) => void
  options: { value: T; name: ReactNode; preview: ReactNode; ariaLabel?: string }[]
}) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      value={value}
      onValueChange={(v) => v && onChange(v as T)}
      aria-label={label}
      className="w-full items-stretch"
    >
      {options.map((o) => (
        <ToggleGroupItem
          key={o.value}
          value={o.value}
          aria-label={o.ariaLabel}
          className={cn('relative h-auto flex-1 flex-col gap-1 bg-background py-1.5', SELECTED_CLASSES)}
        >
          {/* The check makes the choice clear without relying on color */}
          {o.value === value && (
            <span aria-hidden className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-background text-foreground">
              <Check className="size-3" strokeWidth={3} />
            </span>
          )}
          <span aria-hidden className="flex h-5 items-end justify-center">
            {o.preview}
          </span>
          <span className="text-xs">{o.name}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

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
        <Label htmlFor={id} className="leading-normal font-normal">
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

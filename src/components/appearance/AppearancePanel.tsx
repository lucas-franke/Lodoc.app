import { Check, Moon, RotateCcw, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import type { ReactNode } from 'react'
import { Tip } from '@/components/Tip'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { resetAppearance, updateAppearance, useAppearance } from '@/hooks/useAppearance'
import { RADIUS_PRESETS, TEXTURES, TINTS, tintColor, type Appearance } from '@/lib/appearance'
import { cn } from '@/lib/utils'

const TEXT_SIZE_OPTIONS = [
  { id: 's', name: 'Small', sample: 14 },
  { id: 'm', name: 'Default', sample: 18 },
  { id: 'l', name: 'Large', sample: 22 },
] as const

/** The Appearance settings, as a panel on the right so the page stays visible and changes show live. */
export function AppearancePanel({
  open,
  onOpenChange,
  returnFocus,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Where focus goes back to when the panel closes (it is opened by a button outside the Sheet) */
  returnFocus: () => void
}) {
  const a = useAppearance()
  const { resolvedTheme, setTheme } = useTheme()
  const mode = resolvedTheme === 'dark' ? 'dark' : 'light'

  // A ToggleGroup "single" may report '' when the active item is clicked again; keep the current value then
  const choose =
    <K extends keyof Appearance>(key: K) =>
    (value: string) =>
      value && updateAppearance({ [key]: value } as Partial<Appearance>)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" overlayClassName="bg-transparent supports-backdrop-filter:backdrop-blur-none" className="w-[380px] gap-0 sm:max-w-[380px] floating:inset-y-2 floating:right-2 floating:h-auto floating:overflow-hidden floating:rounded-xl floating:border floating:shadow-lg"
        onCloseAutoFocus={(e) => {
          e.preventDefault()
          returnFocus()
        }}>
        <SheetHeader className="border-b">
          <SheetTitle>Appearance</SheetTitle>
          <SheetDescription>Changes apply right away and are remembered in this browser.</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
          <Section
            title="Color"
            action={
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                value={mode}
                onValueChange={(v) => v && setTheme(v)}
                aria-label="Light or dark mode"
              >
                <ToggleGroupItem value="light" aria-label="Light mode">
                  <Sun />
                </ToggleGroupItem>
                <ToggleGroupItem value="dark" aria-label="Dark mode">
                  <Moon />
                </ToggleGroupItem>
              </ToggleGroup>
            }
          >
            <Row label="Tint">
              <ToggleGroup
                type="single"
                value={a.tint}
                onValueChange={choose('tint')}
                aria-label="Tint"
                className="flex-wrap gap-2"
                spacing={2}
              >
                {TINTS.map((t) => (
                  <Tip key={t.id} label={t.name}>
                    <ToggleGroupItem
                      value={t.id}
                      aria-label={t.name}
                      data-tint-swatch={t.id}
                      className="size-9 rounded-full border p-0 data-[state=on]:bg-transparent data-[state=on]:ring-2 data-[state=on]:ring-ring data-[state=on]:ring-offset-2 data-[state=on]:ring-offset-popover"
                      style={{ backgroundColor: tintColor(t, mode) }}
                    >
                      {a.tint === t.id && <Check className="text-foreground" />}
                    </ToggleGroupItem>
                  </Tip>
                ))}
              </ToggleGroup>
            </Row>
            <SwitchRow
              id="ap-gradient"
              label="Gradient"
              hint="A soft glow of the tint color from the top left"
              checked={a.gradient}
              onChange={(gradient) => updateAppearance({ gradient })}
            />
          </Section>

          <Section title="Text">
            <Row label="Font">
              <ToggleGroup
                type="single"
                variant="outline"
                value={a.pageFont}
                onValueChange={choose('pageFont')}
                aria-label="Page font"
                className="w-full"
              >
                {(['sans', 'serif'] as const).map((f) => (
                  <ToggleGroupItem key={f} value={f} className="h-auto flex-1 flex-col gap-0.5 py-2">
                    <span aria-hidden className="text-xl leading-none" data-font-sample={f}>
                      Ag
                    </span>
                    <span className="text-xs">{f === 'sans' ? 'Sans serif' : 'Serif'}</span>
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </Row>
            <Row label="Size">
              <ToggleGroup
                type="single"
                variant="outline"
                value={a.textSize}
                onValueChange={choose('textSize')}
                aria-label="Text size"
                className="w-full"
              >
                {TEXT_SIZE_OPTIONS.map((s) => (
                  <ToggleGroupItem key={s.id} value={s.id} className="h-auto flex-1 flex-col gap-1.5 py-2">
                    <span aria-hidden className="flex h-7 items-end leading-none" data-font-sample={a.pageFont}>
                      <span style={{ fontSize: s.sample }}>Aa</span>
                    </span>
                    <span className="text-xs">{s.name}</span>
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </Row>
            <p className="text-xs text-muted-foreground">Used for note titles and text. Menus keep their own font.</p>
          </Section>

          <Section title="Layout">
            <Row label="Page width">
              <ToggleGroup
                type="single"
                variant="outline"
                value={a.pageWidth}
                onValueChange={choose('pageWidth')}
                aria-label="Page width"
                className="w-full"
              >
                <ToggleGroupItem value="normal" className="flex-1">Normal</ToggleGroupItem>
                <ToggleGroupItem value="wide" className="flex-1">Wide</ToggleGroupItem>
              </ToggleGroup>
            </Row>
            <Row label="Sidebar" hint="Floating keeps a small gap around the sidebar">
              <ToggleGroup
                type="single"
                variant="outline"
                value={a.sidebar}
                onValueChange={choose('sidebar')}
                aria-label="Sidebar style"
                className="w-full"
              >
                {(['connected', 'floating'] as const).map((s) => (
                  <ToggleGroupItem key={s} value={s} className="h-auto flex-1 flex-col gap-1.5 py-2">
                    <SidebarPreview floating={s === 'floating'} />
                    <span className="text-xs">{s === 'connected' ? 'Connected' : 'Floating'}</span>
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </Row>
          </Section>

          <Section title="Corners">
            <ToggleGroup
              type="single"
              variant="outline"
              value={a.corners}
              onValueChange={choose('corners')}
              aria-label="Corner style"
              className="w-full"
            >
              {RADIUS_PRESETS.map((p) => (
                <ToggleGroupItem key={p.id} value={p.id} className="h-auto flex-1 flex-col gap-1.5 py-2">
                  <CornerPreview px={p.px} />
                  <span className="text-xs">{p.name}</span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Section>

          <Section title="Texture" last>
            <Row label="Surface" hint="A subtle texture over the whole app">
              <ToggleGroup
                type="single"
                variant="outline"
                value={a.texture}
                onValueChange={choose('texture')}
                aria-label="Texture"
                className="w-full"
              >
                {TEXTURES.map((t) => (
                  <ToggleGroupItem key={t.id} value={t.id} className="h-auto flex-1 flex-col gap-1.5 py-2">
                    <span aria-hidden data-texture-sample={t.id} className="block size-7 rounded-[4px] border bg-background" />
                    <span className="text-xs">{t.name}</span>
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </Row>
          </Section>
        </div>

        <div className="border-t p-3">
          <Button variant="ghost" size="sm" onClick={resetAppearance}>
            <RotateCcw /> Reset to defaults
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Section({
  title,
  action,
  last = false,
  children,
}: {
  title: string
  action?: ReactNode
  last?: boolean
  children: ReactNode
}) {
  return (
    <section aria-label={title}>
      <div className="mb-3 flex min-h-8 items-center justify-between">
        <h3 className="text-sm font-medium">{title}</h3>
        {action}
      </div>
      <div className="space-y-4">{children}</div>
      {!last && <Separator className="my-5" />}
    </section>
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function SwitchRow({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string
  label: string
  hint: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-0.5">
        <Label htmlFor={id}>{label}</Label>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

/** A tiny drawing of the window: sidebar attached to the edge, or floating with a gap. */
function SidebarPreview({ floating }: { floating: boolean }) {
  return (
    <span aria-hidden className="flex h-9 w-14 overflow-hidden rounded-[4px] border bg-background">
      <span className={cn('w-4 bg-muted-foreground/30', floating ? 'm-1 rounded-[2px]' : 'border-r')} />
    </span>
  )
}

function CornerPreview({ px }: { px: number }) {
  return (
    <span
      aria-hidden
      className="block size-7 border-t-2 border-l-2 border-foreground/60"
      style={{ borderTopLeftRadius: Math.round(px * 1.4) }}
    />
  )
}

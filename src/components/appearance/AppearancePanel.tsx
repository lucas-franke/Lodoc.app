import { Check, FileText, LayoutGrid, Monitor, Moon, PanelLeft, Palette, RotateCcw, Sun, type LucideIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useState, type ReactNode } from 'react'
import { AppearancePreview, type PreviewArea, type PreviewFlash, type PreviewView } from '@/components/appearance/AppearancePreview'
import { Tip } from '@/components/Tip'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { db } from '@/db/db'
import {
  getAppearance,
  resetAppearance,
  resetAppearanceKeys,
  updateAppearance,
  useAppearance,
} from '@/hooks/useAppearance'
import { openNote, useRoute } from '@/hooks/useRoute'
import {
  APPEARANCE_SECTIONS,
  DEFAULT_APPEARANCE,
  RADIUS_PRESETS,
  TEXTURE_STRENGTH_DEFAULT,
  TEXTURES,
  TINTS,
  tintColor,
  type Appearance,
} from '@/lib/appearance'
import { cn } from '@/lib/utils'

const TEXT_SIZE_OPTIONS = [
  { id: 's', name: 'Small', sample: 14 },
  { id: 'm', name: 'Default', sample: 18 },
  { id: 'l', name: 'Large', sample: 22 },
] as const

type Section = keyof typeof APPEARANCE_SECTIONS
/** Settings that change pages; editing one switches the preview to a page */
const PAGE_KEYS: readonly (keyof Appearance)[] = APPEARANCE_SECTIONS.pages

/**
 * The Appearance settings: a panel on the right with a live preview on top, then the settings grouped by
 * where they show up (Theme everywhere, Pages, Interface).
 */
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
  const { theme, resolvedTheme, setTheme } = useTheme()
  const mode = resolvedTheme === 'dark' ? 'dark' : 'light'
  const route = useRoute()
  const onBoard = route?.type === 'board'

  // The preview shows what is open behind the panel, until the user picks a tab (per route) or edits a page setting
  const routeKey = route ? `${route.type}:${route.id}` : ''
  const [chosen, setChosen] = useState<{ route: string; view: PreviewView } | null>(null)
  const view: PreviewView = chosen?.route === routeKey ? chosen.view : onBoard ? 'board' : 'page'
  const showView = (v: PreviewView) => setChosen({ route: routeKey, view: v })
  const [flash, setFlash] = useState<PreviewFlash>(null)
  const highlight = (area: PreviewArea) => setFlash((f) => ({ area, n: (f?.n ?? 0) + 1 }))

  // After "Reset all": what to bring back with Undo (offered in the footer until the next change)
  const [undo, setUndo] = useState<{ appearance: Appearance; theme: string | undefined } | null>(null)

  const change = (patch: Partial<Appearance>, area: PreviewArea) => {
    updateAppearance(patch)
    setUndo(null)
    if (Object.keys(patch).some((k) => PAGE_KEYS.includes(k as keyof Appearance)) && view !== 'page') showView('page')
    highlight(area)
  }
  // A ToggleGroup "single" may report '' when the active item is clicked again; keep the current value then
  const choose =
    <K extends keyof Appearance>(key: K, area: PreviewArea) =>
    (value: string) =>
      value && change({ [key]: value } as Partial<Appearance>, area)

  const isDefault = (s: Section) =>
    APPEARANCE_SECTIONS[s].every((k) => a[k] === DEFAULT_APPEARANCE[k]) && (s !== 'theme' || theme === 'system')
  const resetSection = (s: Section, area: PreviewArea) => {
    resetAppearanceKeys(APPEARANCE_SECTIONS[s])
    if (s === 'theme') setTheme('system')
    setUndo(null)
    highlight(area)
  }
  const resetAll = () => {
    const before = getAppearance()
    const beforeTheme = theme
    resetAppearance()
    setTheme('system')
    highlight('shell')
    setUndo({ appearance: before, theme: beforeTheme })
  }
  const undoReset = () => {
    if (!undo) return
    updateAppearance(undo.appearance)
    if (undo.theme) setTheme(undo.theme)
    setUndo(null)
    highlight('shell')
  }

  const openLatestNote = async () => {
    const latest = await db.notes.orderBy('updatedAt').last()
    if (latest) openNote(latest.id)
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) setUndo(null)
        onOpenChange(o)
      }}
    >
      <SheetContent
        side="right"
        overlayClassName="bg-transparent supports-backdrop-filter:backdrop-blur-none"
        className="gap-0 data-[side=right]:w-full sm:data-[side=right]:w-[380px] data-[side=right]:sm:max-w-[380px] floating:inset-y-2 floating:right-2 floating:h-auto floating:overflow-hidden floating:rounded-xl floating:border floating:shadow-lg max-sm:floating:left-2 max-sm:floating:w-auto"
        onCloseAutoFocus={(e) => {
          e.preventDefault()
          returnFocus()
        }}
      >
        <SheetHeader className="pb-3">
          <SheetTitle>Appearance</SheetTitle>
          <SheetDescription>Saved in this browser</SheetDescription>
        </SheetHeader>

        <div className="space-y-2 border-b px-4 pb-4">
          <AppearancePreview view={view} pageWidth={a.pageWidth} sidebar={a.sidebar} autoCover={a.autoCover} flash={flash} />
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={view}
            onValueChange={(v) => v && showView(v as PreviewView)}
            aria-label="Preview"
            className="w-full"
          >
            <ToggleGroupItem value="page" className="flex-1">
              <FileText /> Page
            </ToggleGroupItem>
            <ToggleGroupItem value="board" className="flex-1">
              <LayoutGrid /> Board
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
          <SectionBlock
            icon={Palette}
            title="Theme"
            hint="Colors everywhere in Lodoc"
            onReset={isDefault('theme') ? undefined : () => resetSection('theme', 'shell')}
          >
            <Row label="Mode">
              <Tiles
                label="Color mode"
                value={(theme ?? 'system') as 'light' | 'dark' | 'system'}
                onChange={(v) => {
                  setTheme(v)
                  setUndo(null)
                  highlight('shell')
                }}
                options={[
                  { value: 'light', name: 'Light', ariaLabel: 'Light mode', preview: <Sun className="size-5" /> },
                  { value: 'dark', name: 'Dark', ariaLabel: 'Dark mode', preview: <Moon className="size-5" /> },
                  { value: 'system', name: 'System', ariaLabel: 'Follow system', preview: <Monitor className="size-5" /> },
                ]}
              />
            </Row>
            <Row label="Tint">
              <ToggleGroup
                type="single"
                value={a.tint}
                onValueChange={choose('tint', 'shell')}
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
              <p className="text-xs text-muted-foreground" data-tint-name>
                {TINTS.find((t) => t.id === a.tint)?.name}
              </p>
            </Row>
            <SwitchRow
              id="ap-gradient"
              label="Gradient"
              hint="A soft glow of the tint color from the top left"
              checked={a.gradient}
              onChange={(gradient) => change({ gradient }, 'shell')}
            />
          </SectionBlock>

          <SectionBlock
            icon={FileText}
            title="Pages"
            hint="Notes, folders and the overview"
            onReset={isDefault('pages') ? undefined : () => resetSection('pages', 'page')}
          >
            {onBoard && (
              <p className="rounded-md bg-muted/60 px-2.5 py-2 text-xs text-muted-foreground" data-board-hint>
                Boards don't show page width or texture. The preview above does
                {' '}or{' '}
                <button type="button" onClick={openLatestNote} className="font-medium text-foreground underline underline-offset-2">
                  open your latest note
                </button>
                .
              </p>
            )}
            <Row label="Font">
              <Tiles
                label="Page font"
                value={a.pageFont}
                onChange={choose('pageFont', 'page')}
                options={[
                  { value: 'sans', name: 'Sans serif', preview: <FontSample font="sans" /> },
                  { value: 'serif', name: 'Serif', preview: <FontSample font="serif" /> },
                ]}
              />
            </Row>
            <Row label="Text size">
              <Tiles
                label="Text size"
                value={a.textSize}
                onChange={choose('textSize', 'page')}
                options={TEXT_SIZE_OPTIONS.map((s) => ({
                  value: s.id,
                  name: s.name,
                  preview: (
                    <span className="leading-none" data-font-sample={a.pageFont} style={{ fontSize: s.sample }}>
                      Aa
                    </span>
                  ),
                }))}
              />
            </Row>
            <Row label="Page width">
              <Tiles
                label="Page width"
                value={a.pageWidth}
                onChange={choose('pageWidth', 'page')}
                options={[
                  { value: 'normal', name: 'Normal', preview: <WidthPreview wide={false} /> },
                  { value: 'wide', name: 'Wide', preview: <WidthPreview wide /> },
                ]}
              />
            </Row>
            <SwitchRow
              id="ap-auto-cover"
              label="Automatic covers"
              hint="Notes without a chosen cover get a color gradient"
              checked={a.autoCover}
              onChange={(autoCover) => change({ autoCover }, 'page')}
            />
            <Row label="Texture">
              <Tiles
                label="Page texture"
                value={a.texture}
                onChange={choose('texture', 'page')}
                options={TEXTURES.map((t) => ({
                  value: t.id,
                  name: t.name,
                  preview: <span data-texture-sample={t.id} className="block size-7 rounded-[4px] border bg-background" />,
                }))}
              />
            </Row>
            {a.texture !== 'none' && (
              <Row label="Strength">
                <StrengthSlider
                  label="Page texture strength"
                  value={a.textureStrength}
                  onChange={(textureStrength) => change({ textureStrength }, 'page')}
                />
              </Row>
            )}
          </SectionBlock>

          <SectionBlock
            icon={PanelLeft}
            title="Interface"
            hint="Sidebar, menus and panels"
            onReset={isDefault('interface') ? undefined : () => resetSection('interface', 'sidebar')}
            last
          >
            <Row label="Sidebar">
              <Tiles
                label="Sidebar style"
                value={a.sidebar}
                onChange={choose('sidebar', 'sidebar')}
                options={[
                  { value: 'connected', name: 'Connected', preview: <SidebarPreview floating={false} /> },
                  { value: 'floating', name: 'Floating', preview: <SidebarPreview floating /> },
                ]}
              />
            </Row>
            <Row label="Corners">
              <Tiles
                label="Corner style"
                value={a.corners}
                onChange={choose('corners', 'shell')}
                options={RADIUS_PRESETS.map((p) => ({ value: p.id, name: p.name, preview: <CornerPreview px={p.px} /> }))}
              />
            </Row>
            <SwitchRow
              id="ap-ui-grain"
              label="Grain"
              hint="A fine noise on the sidebar, menus and this panel"
              checked={a.uiGrain}
              onChange={(uiGrain) => change({ uiGrain }, 'sidebar')}
            />
            {a.uiGrain && (
              <Row label="Intensity">
                <StrengthSlider
                  label="Interface grain intensity"
                  value={a.uiGrainStrength}
                  onChange={(uiGrainStrength) => change({ uiGrainStrength }, 'sidebar')}
                />
              </Row>
            )}
          </SectionBlock>
        </div>

        <div className="flex items-center gap-2 border-t p-3">
          <Button variant="ghost" size="sm" onClick={resetAll}>
            <RotateCcw /> Reset all
          </Button>
          {undo && (
            <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground" role="status">
              Back to defaults
              <Button variant="outline" size="xs" onClick={undoReset}>
                Undo
              </Button>
            </span>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function SectionBlock({
  icon: Icon,
  title,
  hint,
  onReset,
  last = false,
  children,
}: {
  icon: LucideIcon
  title: string
  hint: string
  /** Shown only when the section differs from the defaults */
  onReset?: () => void
  last?: boolean
  children: ReactNode
}) {
  return (
    <section aria-label={title}>
      <div className="mb-4 flex min-h-8 items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <Icon aria-hidden className="size-4 text-muted-foreground" />
            {title}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
        </div>
        {onReset && (
          <Button variant="ghost" size="xs" onClick={onReset} aria-label={`Reset ${title}`}>
            Reset
          </Button>
        )}
      </div>
      <div className="space-y-4">{children}</div>
      {!last && <Separator className="my-5" />}
    </section>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      {children}
    </div>
  )
}

/** One row of choices, all in the same tile style: a small preview on top, the name below */
function Tiles<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: T
  onChange: (value: T) => void
  options: { value: T; name: string; preview: ReactNode; ariaLabel?: string }[]
}) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      value={value}
      onValueChange={(v) => v && onChange(v as T)}
      aria-label={label}
      className="w-full"
    >
      {options.map((o) => (
        <ToggleGroupItem key={o.value} value={o.value} aria-label={o.ariaLabel} className="h-auto flex-1 flex-col gap-1.5 py-2">
          <span aria-hidden className="flex h-7 items-end justify-center">
            {o.preview}
          </span>
          <span className="text-xs">{o.name}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
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

/** 0–100 %, with a dot marking the default (50 %, each texture's tuned strength) */
function StrengthSlider({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
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
      className="h-6 [--slider-thumb:1.5rem] **:data-[slot=slider-range]:bg-transparent **:data-[slot=slider-thumb]:size-(--slider-thumb) **:data-[slot=slider-thumb]:border-border dark:**:data-[slot=slider-thumb]:border-transparent **:data-[slot=slider-thumb]:shadow-md **:data-[slot=slider-track]:h-6! **:data-[slot=slider-track]:border **:data-[slot=slider-track]:bg-muted/60"
    />
  )
}

function FontSample({ font }: { font: 'sans' | 'serif' }) {
  return (
    <span className="text-xl leading-none" data-font-sample={font}>
      Ag
    </span>
  )
}

/** A page with its text block: narrow (normal) or almost the full width (wide) */
function WidthPreview({ wide }: { wide: boolean }) {
  return (
    <span className="flex h-7 w-11 flex-col items-center justify-center gap-1 rounded-[4px] border bg-background">
      {[1, 0.8, 1].map((f, i) => (
        <span key={i} className="block h-0.5 rounded-full bg-muted-foreground/50" style={{ width: `${(wide ? 34 : 18) * f}px` }} />
      ))}
    </span>
  )
}

/** A tiny drawing of the window: sidebar attached to the edge, or floating with a gap. */
function SidebarPreview({ floating }: { floating: boolean }) {
  return (
    <span className="flex h-7 w-11 overflow-hidden rounded-[4px] border bg-background">
      <span className={cn('w-3 bg-muted-foreground/30', floating ? 'm-0.5 rounded-[2px]' : 'border-r')} />
    </span>
  )
}

function CornerPreview({ px }: { px: number }) {
  return (
    <span
      className="block size-7 border-t-2 border-l-2 border-foreground/60"
      style={{ borderTopLeftRadius: Math.round(px * 1.4) }}
    />
  )
}

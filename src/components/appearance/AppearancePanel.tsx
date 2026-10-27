import { Accessibility, Check, Dices, FileText, LayoutGrid, Monitor, Moon, PanelLeft, Palette, RotateCcw, Sun, type LucideIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { AppearancePreview, type PreviewArea, type PreviewFlash, type PreviewView } from '@/components/appearance/AppearancePreview'
import { Tip } from '@/components/Tip'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
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
import { useWideScreen } from '@/hooks/useWideScreen'
import { crossfade, playOnce } from '@/lib/joy'
import { openNote, useRoute } from '@/hooks/useRoute'
import {
  APPEARANCE_SECTIONS,
  DEFAULT_APPEARANCE,
  randomAppearance,
  RADIUS_PRESETS,
  TEXTURE_STRENGTH_DEFAULT,
  TEXTURES,
  TINTS,
  tintSwatchColor,
  type Appearance,
} from '@/lib/appearance'
import { showPaperTextureSamples } from '@/lib/paper-texture'
import { cn } from '@/lib/utils'

const TEXT_SIZE_OPTIONS = [
  { id: 's', name: 'Small', sample: 14 },
  { id: 'm', name: 'Default', sample: 18 },
  { id: 'l', name: 'Large', sample: 22 },
] as const

type Section = keyof typeof APPEARANCE_SECTIONS

const SECTIONS: { id: Section; title: string; hint: string; icon: LucideIcon }[] = [
  { id: 'theme', title: 'Theme', hint: 'Colors everywhere in Lodoc', icon: Palette },
  { id: 'pages', title: 'Pages', hint: 'Notes, folders and the overview', icon: FileText },
  { id: 'interface', title: 'Interface', hint: 'Sidebar, menus and panels', icon: PanelLeft },
  { id: 'accessibility', title: 'Accessibility', hint: 'Contrast and motion', icon: Accessibility },
]
/** Settings that change pages; editing one switches the preview to a page */
const PAGE_KEYS: readonly (keyof Appearance)[] = APPEARANCE_SECTIONS.pages

/**
 * The Appearance settings: a dialog with the sections on the left (tabs on a phone), and a live preview above
 * the settings of the chosen section (Theme everywhere, Pages, Interface, Accessibility).
 */
export function AppearancePanel({
  open,
  onOpenChange,
  returnFocus,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Where focus goes back to when the dialog closes (it is opened from outside, without a trigger) */
  returnFocus: () => void
}) {
  const a = useAppearance()
  const wide = useWideScreen()
  const { theme, resolvedTheme, setTheme } = useTheme()
  const mode = resolvedTheme === 'dark' ? 'dark' : 'light'
  const route = useRoute()
  const onBoard = route?.type === 'board'
  const [section, setSection] = useState<Section>('theme')
  const current = SECTIONS.find((x) => x.id === section)!

  // The preview shows what is open behind the panel, until the user picks a tab (per route) or edits a page setting
  const routeKey = route ? `${route.type}:${route.id}` : ''
  const [chosen, setChosen] = useState<{ route: string; view: PreviewView } | null>(null)
  const view: PreviewView = chosen?.route === routeKey ? chosen.view : onBoard ? 'board' : 'page'
  const showView = (v: PreviewView) => setChosen({ route: routeKey, view: v })
  const [flash, setFlash] = useState<PreviewFlash>(null)
  const highlight = (area: PreviewArea) => setFlash((f) => ({ area, n: (f?.n ?? 0) + 1 }))

  // The resolved contrast (System included), and what the system asks for, for the hints
  const high = useRootData('contrast') === 'high'
  const systemHigh = useMediaQuery('(prefers-contrast: more)')
  const systemReduce = useMediaQuery('(prefers-reduced-motion: reduce)')

  // After "Reset all" or "Randomize": what to bring back with Undo (offered in the footer until the next change)
  const [undo, setUndo] = useState<{ appearance: Appearance; theme: string | undefined; status: string } | null>(null)

  // The texture tiles below show the shader-rendered papers, not only the chosen one
  useEffect(() => {
    if (open) showPaperTextureSamples()
  }, [open])

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
  const reset = (s: Section, area: PreviewArea) => (isDefault(s) ? undefined : () => resetSection(s, area))
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
    setUndo({ appearance: before, theme: beforeTheme, status: 'Back to defaults' })
  }
  const randomize = (e: React.MouseEvent<HTMLButtonElement>) => {
    const before = getAppearance()
    // The dice roll, and the new look fades in
    const dice = e.currentTarget.querySelector('svg')
    if (dice) playOnce(dice, 'joy-roll')
    // Undo keeps the look from before the first of several rolls in a row
    crossfade(() => updateAppearance(randomAppearance(before)))
    highlight('shell')
    setUndo((u) => (u?.status === 'Randomized' ? u : { appearance: before, theme, status: 'Randomized' }))
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
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setUndo(null)
        onOpenChange(o)
      }}
    >
      <DialogContent
        // A light dim without blur, so the page behind still shows each change
        overlayClassName="bg-black/15 supports-backdrop-filter:backdrop-blur-none"
        onCloseAutoFocus={(e) => {
          e.preventDefault()
          returnFocus()
        }}
        className="flex h-[min(46rem,calc(100dvh-2rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl max-sm:inset-0 max-sm:h-dvh max-sm:max-w-none max-sm:translate-0 max-sm:rounded-none max-sm:safe-area-padding-y"
      >
        <div className="border-b px-5 pt-4 pb-3">
          <DialogTitle>Appearance</DialogTitle>
          <DialogDescription className="mt-1">Saved in this browser</DialogDescription>
        </div>

        <div className="flex min-h-0 flex-1">
          <SectionTabs value={section} onChange={setSection} orientation="vertical" className="hidden w-44 shrink-0 border-r p-2 sm:flex" />

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="space-y-2 border-b px-4 py-4 sm:px-5">
              <AppearancePreview view={view} sidebar={wide ? a.sidebar : 'connected'} autoCover={a.autoCover} flash={flash} />
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
            <SectionTabs value={section} onChange={setSection} orientation="horizontal" className="border-b px-2 py-1.5 sm:hidden" />

            <div
              role="tabpanel"
              id="appearance-section"
              aria-labelledby={`appearance-tab-${section}`}
              className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-5"
            >
              <SectionBlock title={current.title} hint={current.hint} onReset={reset(section, SECTION_AREA[section])}>
                {section === 'theme' && (
                  <>
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
                              className="size-9 rounded-full border p-0 aria-checked:ring-2 aria-checked:ring-ring aria-checked:ring-offset-2 aria-checked:ring-offset-popover"
                              style={{ backgroundColor: tintSwatchColor(t, mode) }}
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
                      hint={high ? 'Off while high contrast is on' : 'A soft glow of the tint color from the top left'}
                      checked={a.gradient}
                      onChange={(gradient) => change({ gradient }, 'shell')}
                    />
                    <SwitchRow
                      id="ap-tinted-text"
                      label="Tinted text"
                      hint={a.tint === 'neutral' ? 'Pick a tint above to see it in the text' : 'Text takes on a touch of the tint color'}
                      checked={a.tintedText}
                      onChange={(tintedText) => change({ tintedText }, 'shell')}
                    />
                  </>
                )}
                {section === 'pages' && (
                  <>
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
                  </>
                )}
                {section === 'interface' && (
                  <>
                    {/* Desktop only: on a phone the sidebar lies over the page, and a floating one would only take room */}
                    {wide && (
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
                    )}
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
                      hint="A fine noise on the sidebar, menus and this window"
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
                  </>
                )}
                {section === 'accessibility' && (
                  <>
                    <Row label="Contrast">
                      <Tiles
                        label="Contrast"
                        value={a.contrast}
                        onChange={choose('contrast', 'shell')}
                        options={[
                          { value: 'system', name: 'System', ariaLabel: 'Contrast: follow system', preview: <Monitor className="size-5" /> },
                          { value: 'more', name: 'High', ariaLabel: 'High contrast', preview: <ContrastSample high /> },
                          { value: 'standard', name: 'Standard', ariaLabel: 'Standard contrast', preview: <ContrastSample high={false} /> },
                        ]}
                      />
                      <p className="text-xs text-muted-foreground">
                        High contrast: stronger text and lines, softer textures and no gradient.
                        {a.contrast === 'system' && ` Your system asks for ${systemHigh ? 'high' : 'standard'} contrast.`}
                      </p>
                    </Row>
                    <Row label="Motion">
                      <Tiles
                        label="Motion"
                        value={a.motion}
                        onChange={choose('motion', 'shell')}
                        options={[
                          { value: 'system', name: 'System', ariaLabel: 'Motion: follow system', preview: <Monitor className="size-5" /> },
                          { value: 'reduce', name: 'Reduced', ariaLabel: 'Reduced motion', preview: <MotionSample moving={false} /> },
                          { value: 'full', name: 'Full', ariaLabel: 'Full motion', preview: <MotionSample moving /> },
                        ]}
                      />
                      <p className="text-xs text-muted-foreground">
                        Reduced motion: no animations or gliding; things change at once.
                        {a.motion === 'system' && ` Your system asks for ${systemReduce ? 'reduced' : 'full'} motion.`}
                      </p>
                    </Row>
                  </>
                )}
              </SectionBlock>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t p-3">
          <Button variant="ghost" size="sm" onClick={resetAll}>
            <RotateCcw /> Reset all
          </Button>
          <Button variant="ghost" size="sm" onClick={randomize}>
            <Dices /> Randomize
          </Button>
          {undo && (
            <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground" role="status">
              {undo.status}
              <Button variant="outline" size="xs" onClick={undoReset}>
                Undo
              </Button>
            </span>
          )}
          <DialogClose asChild>
            <Button size="sm" className={cn(!undo && 'ml-auto')}>
              Done
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Where a reset of each section shows in the preview */
const SECTION_AREA: Record<Section, PreviewArea> = { theme: 'shell', pages: 'page', interface: 'sidebar', accessibility: 'shell' }

/** The section list: down the side on wide screens, four tabs in a row on a phone (arrow keys move between them) */
function SectionTabs({
  value,
  onChange,
  orientation,
  className,
}: {
  value: Section
  onChange: (section: Section) => void
  orientation: 'vertical' | 'horizontal'
  className?: string
}) {
  const list = useRef<HTMLDivElement>(null)
  const vertical = orientation === 'vertical'
  const onKeyDown = (e: KeyboardEvent) => {
    const step = { [vertical ? 'ArrowDown' : 'ArrowRight']: 1, [vertical ? 'ArrowUp' : 'ArrowLeft']: -1 }[e.key]
    const index = SECTIONS.findIndex((x) => x.id === value)
    const next = step
      ? (index + step + SECTIONS.length) % SECTIONS.length
      : e.key === 'Home'
        ? 0
        : e.key === 'End'
          ? SECTIONS.length - 1
          : null
    if (next === null) return
    e.preventDefault()
    onChange(SECTIONS[next].id)
    list.current?.querySelectorAll<HTMLElement>('[role=tab]')[next]?.focus()
  }
  return (
    <div
      ref={list}
      role="tablist"
      aria-label="Appearance sections"
      aria-orientation={orientation}
      onKeyDown={onKeyDown}
      className={cn(vertical ? 'flex-col gap-0.5' : 'grid grid-cols-4 gap-1', className)}
    >
      {SECTIONS.map(({ id, title, icon: Icon }) => (
        <button
          key={id}
          type="button"
          role="tab"
          // Only one of the two lists is shown at a time, so the ids don't clash in practice; the hidden one is display:none
          id={vertical ? `appearance-tab-${id}` : undefined}
          aria-selected={value === id}
          aria-controls="appearance-section"
          tabIndex={value === id ? 0 : -1}
          onClick={() => onChange(id)}
          className={cn(
            'flex items-center rounded-md outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/60 aria-selected:bg-accent aria-selected:font-medium',
            vertical ? 'min-h-9 w-full gap-2 px-2.5 text-left text-sm' : 'min-h-11 min-w-0 flex-col justify-center gap-0.5 px-1 text-xs',
          )}
        >
          <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          {title}
        </button>
      ))}
    </div>
  )
}

function SectionBlock({
  title,
  hint,
  onReset,
  children,
}: {
  title: string
  hint: string
  /** Shown only when the section differs from the defaults */
  onReset?: () => void
  children: ReactNode
}) {
  return (
    <section aria-label={title}>
      <div className="mb-4 flex min-h-8 items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium">{title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
        </div>
        {onReset && (
          <Button variant="ghost" size="xs" onClick={onReset} aria-label={`Reset ${title}`}>
            Reset
          </Button>
        )}
      </div>
      <div className="space-y-4">{children}</div>
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

/** A tiny drawing of the window: sidebar attached to the edge, or floating with a gap. */
function SidebarPreview({ floating }: { floating: boolean }) {
  return (
    <span className="flex h-7 w-11 overflow-hidden rounded-[4px] border bg-background">
      <span className={cn('w-3 bg-muted-foreground/30', floating ? 'm-0.5 rounded-[2px]' : 'border-r')} />
    </span>
  )
}

/** "Aa" in faint or strong ink */
function ContrastSample({ high }: { high: boolean }) {
  return (
    <span className={cn('text-lg leading-none font-semibold', high ? 'text-foreground' : 'text-muted-foreground')}>Aa</span>
  )
}

/** A dot with motion lines behind it, or a still dot */
function MotionSample({ moving }: { moving: boolean }) {
  return (
    <span className="flex items-center gap-0.5">
      {moving && (
        <span className="flex flex-col gap-0.5">
          <span className="h-0.5 w-2 rounded-full bg-muted-foreground/50" />
          <span className="h-0.5 w-3 rounded-full bg-muted-foreground/50" />
          <span className="h-0.5 w-2 rounded-full bg-muted-foreground/50" />
        </span>
      )}
      <span className="size-3 rounded-full bg-foreground/70" />
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

/** A data attribute on <html>, kept current (lib/appearance.ts sets them) */
function useRootData(name: string) {
  const [value, setValue] = useState(() => document.documentElement.dataset[name])
  useEffect(() => {
    const observer = new MutationObserver(() => setValue(document.documentElement.dataset[name]))
    observer.observe(document.documentElement, { attributeFilter: [`data-${name}`] })
    return () => observer.disconnect()
  }, [name])
  return value
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const list = window.matchMedia(query)
    const update = () => setMatches(list.matches)
    list.addEventListener('change', update)
    return () => list.removeEventListener('change', update)
  }, [query])
  return matches
}

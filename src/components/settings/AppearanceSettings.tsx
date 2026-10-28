import { Check, Dices, FileText, Monitor, Moon, PanelLeft, Palette, RotateCcw, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { AppearancePreview } from '@/components/settings/AppearancePreview'
import { Row, SECTION_SCROLL, SectionBlock, SettingsFooter, StrengthSlider, SwitchRow, Tiles } from '@/components/settings/controls'
import { useRootData } from '@/hooks/useRootData'
import { Tip } from '@/components/Tip'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  getAppearance,
  resetAppearance,
  resetAppearanceKeys,
  updateAppearance,
  useAppearance,
} from '@/hooks/useAppearance'
import { useWideScreen } from '@/hooks/useWideScreen'
import { crossfade, playOnce } from '@/lib/joy'
import { useRoute } from '@/hooks/useRoute'
import {
  APPEARANCE_SECTIONS,
  DEFAULT_APPEARANCE,
  randomAppearance,
  RADIUS_PRESETS,
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

/** The look's own sections; contrast and motion have the Accessibility tab */
type Section = 'theme' | 'pages' | 'interface'

/**
 * The Appearance tab of Settings: a live preview on top (Settings covers the page), then the settings in one
 * column, grouped by where they show up (Theme everywhere, Pages, Interface), so looks can be combined freely.
 */
export function AppearanceSettings() {
  const a = useAppearance()
  const wide = useWideScreen()
  const { theme, resolvedTheme, setTheme } = useTheme()
  const mode = resolvedTheme === 'dark' ? 'dark' : 'light'
  const onBoard = useRoute()?.type === 'board'
  const [flash, setFlash] = useState(0)
  const highlight = () => setFlash((n) => n + 1)

  // High contrast turns the gradient off (lib/appearance.ts); the switch says so
  const high = useRootData('contrast') === 'high'

  // After "Reset all" or "Randomize": what to bring back with Undo (offered in the footer until the next change)
  const [undo, setUndo] = useState<{ appearance: Appearance; theme: string | undefined; status: string } | null>(null)

  // The texture tiles below show the shader-rendered papers, not only the chosen one. They are drawn just
  // after the window has appeared, so the shader work doesn't stall its opening animation
  useEffect(() => {
    const id = window.setTimeout(showPaperTextureSamples, 150)
    return () => window.clearTimeout(id)
  }, [])

  const change = (patch: Partial<Appearance>) => {
    updateAppearance(patch)
    setUndo(null)
    highlight()
  }
  // A ToggleGroup "single" may report '' when the active item is clicked again; keep the current value then
  const choose =
    <K extends keyof Appearance>(key: K) =>
    (value: string) =>
      value && change({ [key]: value } as Partial<Appearance>)

  const isDefault = (s: Section) =>
    APPEARANCE_SECTIONS[s].every((k) => a[k] === DEFAULT_APPEARANCE[k]) && (s !== 'theme' || theme === 'system')
  const resetSection = (s: Section) => {
    resetAppearanceKeys(APPEARANCE_SECTIONS[s])
    if (s === 'theme') setTheme('system')
    setUndo(null)
    highlight()
  }
  const resetAll = () => {
    const before = getAppearance()
    const beforeTheme = theme
    resetAppearance()
    setTheme('system')
    highlight()
    setUndo({ appearance: before, theme: beforeTheme, status: 'Back to defaults' })
  }
  const randomize = (e: React.MouseEvent<HTMLButtonElement>) => {
    const before = getAppearance()
    // The dice roll, and the new look fades in
    const dice = e.currentTarget.querySelector('svg')
    if (dice) playOnce(dice, 'joy-roll')
    // Undo keeps the look from before the first of several rolls in a row
    crossfade(() => updateAppearance(randomAppearance(before)))
    highlight()
    setUndo((u) => (u?.status === 'Randomized' ? u : { appearance: before, theme, status: 'Randomized' }))
  }
  const undoReset = () => {
    if (!undo) return
    updateAppearance(undo.appearance)
    if (undo.theme) setTheme(undo.theme)
    setUndo(null)
    highlight()
  }

  return (
    <>
      {/* Settings covers the page, so the preview stays in view while the settings below scroll */}
      <div className="border-b p-4 sm:px-6">
        {/* On a phone just the note: the sidebar there lies over the page anyway */}
        <div className="sm:hidden">
          <AppearancePreview sidebar="connected" autoCover={a.autoCover} flash={flash} compact />
        </div>
        <div className="hidden sm:block">
          <AppearancePreview sidebar={wide ? a.sidebar : 'connected'} autoCover={a.autoCover} flash={flash} />
        </div>
      </div>

      <div className={SECTION_SCROLL}>
        <SectionBlock
          icon={Palette}
          title="Theme"
          hint="Colors everywhere in Lodoc"
          onReset={isDefault('theme') ? undefined : () => resetSection('theme')}
        >
          <Row label="Mode">
            <Tiles
              label="Color mode"
              value={(theme ?? 'system') as 'light' | 'dark' | 'system'}
              onChange={(v) => {
                setTheme(v)
                setUndo(null)
                highlight()
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
                    className="size-9 rounded-full border border-control-border p-0 focus-visible:border-control-border aria-checked:ring-2 aria-checked:ring-foreground aria-checked:ring-offset-2 aria-checked:ring-offset-popover"
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
            onChange={(gradient) => change({ gradient })}
          />
          <SwitchRow
            id="ap-tinted-text"
            label="Tinted text"
            hint={a.tint === 'neutral' ? 'Pick a tint above to see it in the text' : 'Text takes on a touch of the tint color'}
            checked={a.tintedText}
            onChange={(tintedText) => change({ tintedText })}
          />
        </SectionBlock>

        <SectionBlock
          icon={FileText}
          title="Pages"
          hint="Notes, folders and the overview"
          onReset={isDefault('pages') ? undefined : () => resetSection('pages')}
        >
          {onBoard && (
            <p className="rounded-md bg-muted/60 px-2.5 py-2 text-xs text-muted-foreground" data-board-hint>
              Boards don't show page width or texture; the page in the preview above does.
            </p>
          )}
          <Row label="Font">
            <Tiles
              label="Page font"
              value={a.pageFont}
              onChange={choose('pageFont')}
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
              onChange={choose('textSize')}
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
            onChange={(autoCover) => change({ autoCover })}
          />
          <Row label="Texture">
            <Tiles
              label="Page texture"
              value={a.texture}
              onChange={choose('texture')}
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
                onChange={(textureStrength) => change({ textureStrength })}
              />
            </Row>
          )}
        </SectionBlock>

        <SectionBlock
          icon={PanelLeft}
          title="Interface"
          hint="Sidebar, menus and panels"
          onReset={isDefault('interface') ? undefined : () => resetSection('interface')}
          last
        >
          {/* Desktop only: on a phone the sidebar lies over the page, and a floating one would only take room */}
          {wide && (
            <Row label="Sidebar">
              <Tiles
                label="Sidebar style"
                value={a.sidebar}
                onChange={choose('sidebar')}
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
              onChange={choose('corners')}
              options={RADIUS_PRESETS.map((p) => ({ value: p.id, name: p.name, preview: <CornerPreview px={p.px} /> }))}
            />
          </Row>
          <SwitchRow
            id="ap-ui-grain"
            label="Grain"
            hint="A fine noise on the sidebar, menus and panels"
            checked={a.uiGrain}
            onChange={(uiGrain) => change({ uiGrain })}
          />
          {a.uiGrain && (
            <Row label="Intensity">
              <StrengthSlider
                label="Interface grain intensity"
                value={a.uiGrainStrength}
                onChange={(uiGrainStrength) => change({ uiGrainStrength })}
              />
            </Row>
          )}
        </SectionBlock>
      </div>

      <SettingsFooter>
        <Button variant="ghost" size="sm" onClick={resetAll}>
          <RotateCcw /> Reset all
        </Button>
        <Button variant="ghost" size="sm" onClick={randomize}>
          <Dices /> Randomize
        </Button>
        {undo && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground" role="status">
            {undo.status}
            <Button variant="outline" size="xs" onClick={undoReset}>
              Undo
            </Button>
          </span>
        )}
      </SettingsFooter>
    </>
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

function CornerPreview({ px }: { px: number }) {
  return (
    <span
      className="block size-7 border-t-2 border-l-2 border-foreground/60"
      style={{ borderTopLeftRadius: Math.round(px * 1.4) }}
    />
  )
}

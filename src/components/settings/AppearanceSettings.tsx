import { Check, Dices, FileText, Monitor, Moon, PanelLeft, Palette, RotateCcw, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Row, SectionBlock, Segmented, SettingsToolbar, StrengthSlider, SwitchRow, Tiles } from '@/components/settings/controls'
import { useRootData } from '@/hooks/useRootData'
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
import {
  APPEARANCE_SECTIONS,
  DEFAULT_APPEARANCE,
  randomAppearance,
  RADIUS_PRESETS,
  TEXT_SIZES,
  TEXTURES,
  TINTS,
  tintSwatchColor,
  type Appearance,
} from '@/lib/appearance'
import { showPaperTextureSamples } from '@/lib/paper-texture'
import { cn } from '@/lib/utils'

const TEXT_SIZE_OPTIONS = [
  { id: 's', name: 'Small' },
  { id: 'm', name: 'Default' },
  { id: 'l', name: 'Large' },
] as const

/** The look's own sections; contrast and motion have the Accessibility tab */
type Section = 'theme' | 'pages' | 'interface'

/**
 * The Appearance tab of Settings: the settings in one column, grouped by where they show up (Theme everywhere, Pages,
 * Interface), so looks can be combined freely. Every change shows at once in the app around it.
 */
export function AppearanceSettings() {
  const a = useAppearance()
  const wide = useWideScreen()
  const { theme, resolvedTheme, setTheme } = useTheme()
  const mode = resolvedTheme === 'dark' ? 'dark' : 'light'

  // High contrast turns the gradient off (lib/appearance.ts); the switch says so
  const high = useRootData('contrast') === 'high'

  // After "Reset all" or "Randomize": what to bring back with Undo (offered beside them until the next change)
  const [undo, setUndo] = useState<{ appearance: Appearance; theme: string | undefined; status: string } | null>(null)

  // The texture tiles below show the shader-rendered papers, not only the chosen one. They are drawn just
  // after the page has appeared, so the shader work doesn't hold up showing it
  useEffect(() => {
    const id = window.setTimeout(showPaperTextureSamples, 150)
    return () => window.clearTimeout(id)
  }, [])

  const change = (patch: Partial<Appearance>) => {
    updateAppearance(patch)
    setUndo(null)
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
  }
  const resetAll = () => {
    const before = getAppearance()
    const beforeTheme = theme
    resetAppearance()
    setTheme('system')
    setUndo({ appearance: before, theme: beforeTheme, status: 'Back to defaults' })
  }
  const randomize = (e: React.MouseEvent<HTMLButtonElement>) => {
    const before = getAppearance()
    // The dice roll, and the new look fades in
    const dice = e.currentTarget.querySelector('svg')
    if (dice) playOnce(dice, 'joy-roll')
    // Undo keeps the look from before the first of several rolls in a row
    crossfade(() => updateAppearance(randomAppearance(before)))
    setUndo((u) => (u?.status === 'Randomized' ? u : { appearance: before, theme, status: 'Randomized' }))
  }
  const undoReset = () => {
    if (!undo) return
    updateAppearance(undo.appearance)
    if (undo.theme) setTheme(undo.theme)
    setUndo(null)
  }
  // Undo, beside the action it takes back
  const undoFor = (status: string) =>
    undo?.status === status && (
      <span className="flex items-center gap-1 text-xs text-muted-foreground" role="status">
        {undo.status}
        <Button variant="outline" size="xs" onClick={undoReset}>
          Undo
        </Button>
      </span>
    )

  return (
    <>
      <SettingsToolbar>
        <Button variant="ghost" size="sm" onClick={randomize}>
          <Dices /> Randomize
        </Button>
        {undoFor('Randomized')}
      </SettingsToolbar>
      <SectionBlock
        icon={Palette}
        title="Theme"
        onReset={isDefault('theme') ? undefined : () => resetSection('theme')}
      >
        <Row label="Mode">
          <Segmented
            label="Color mode"
            value={(theme ?? 'system') as 'light' | 'dark' | 'system'}
            onChange={(v) => {
              setTheme(v)
              setUndo(null)
            }}
            options={[
              { value: 'light', name: <><Sun /> Light</>, ariaLabel: 'Light mode' },
              { value: 'dark', name: <><Moon /> Dark</>, ariaLabel: 'Dark mode' },
              { value: 'system', name: <><Monitor /> System</>, ariaLabel: 'Follow system' },
            ]}
          />
        </Row>
        <Row label="Tint">
          <ToggleGroup
            type="single"
            value={a.tint}
            onValueChange={choose('tint')}
            aria-label="Tint"
            className="flex-wrap items-start gap-x-2 gap-y-2"
            spacing={2}
          >
            {/* Each swatch with its name under it, so the names show on touch screens too */}
            {TINTS.map((t) => (
              <span key={t.id} className="flex w-11 flex-col items-center gap-1">
                <ToggleGroupItem
                  value={t.id}
                  aria-label={t.name}
                  data-tint-swatch={t.id}
                  className="size-9 rounded-full border border-control-border p-0 focus-visible:border-control-border aria-checked:ring-2 aria-checked:ring-foreground aria-checked:ring-offset-2 aria-checked:ring-offset-background"
                  style={{ backgroundColor: tintSwatchColor(t, mode) }}
                >
                  {a.tint === t.id && <Check className="text-foreground" />}
                </ToggleGroupItem>
                <span aria-hidden className={cn('text-[0.6875rem] text-muted-foreground', a.tint === t.id && 'font-medium text-foreground')}>
                  {t.name}
                </span>
              </span>
            ))}
          </ToggleGroup>
        </Row>
        {/* High contrast leaves the gradient out, so the switch would do nothing then */}
        {!high && (
          <SwitchRow id="ap-gradient" label="Gradient" checked={a.gradient} onChange={(gradient) => change({ gradient })} />
        )}
        {/* Only with a tint: neutral has no color to tint the text with */}
        {a.tint !== 'neutral' && (
          <SwitchRow
            id="ap-tinted-text"
            label="Tinted text"
            checked={a.tintedText}
            onChange={(tintedText) => change({ tintedText })}
          />
        )}
      </SectionBlock>

      <SectionBlock
        icon={FileText}
        title="Pages"
        onReset={isDefault('pages') ? undefined : () => resetSection('pages')}
      >
        <Row label="Font" stacked>
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
          {/* The names at the size they stand for, in the page font */}
          <Segmented
            label="Text size"
            value={a.textSize}
            onChange={choose('textSize')}
            options={TEXT_SIZE_OPTIONS.map((s) => ({
              value: s.id,
              name: <span data-font-sample={a.pageFont}>{s.name}</span>,
              style: { fontSize: TEXT_SIZES[s.id] },
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
        <Row label="Texture" stacked>
          <Tiles
            label="Page texture"
            value={a.texture}
            onChange={choose('texture')}
            options={TEXTURES.map((t) => ({
              value: t.id,
              name: t.name,
              preview: <span data-texture-sample={t.id} className="block size-5 rounded-[3px] border bg-background" />,
            }))}
          />
        </Row>
        {a.texture !== 'none' && (
          <Row label="Strength" stacked>
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
        onReset={isDefault('interface') ? undefined : () => resetSection('interface')}
        last
      >
        {/* Desktop only: on a phone the sidebar lies over the page, and a floating one would only take room */}
        {wide && (
          <Row label="Sidebar" stacked>
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
        <Row label="Corners" stacked>
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
          hint="On the sidebar, menus and panels"
          checked={a.uiGrain}
          onChange={(uiGrain) => change({ uiGrain })}
        />
        {a.uiGrain && (
          <Row label="Intensity" stacked>
            <StrengthSlider
              label="Interface grain intensity"
              value={a.uiGrainStrength}
              onChange={(uiGrainStrength) => change({ uiGrainStrength })}
            />
          </Row>
        )}
      </SectionBlock>

      {/* At the end: it undoes everything above */}
      <div className="mt-8 flex flex-wrap items-center gap-2 border-t pt-5">
        <Button variant="ghost" size="sm" className="-ml-2.5" onClick={resetAll}>
          <RotateCcw /> Reset all appearance settings
        </Button>
        {undoFor('Back to defaults')}
      </div>
    </>
  )
}

function FontSample({ font }: { font: 'sans' | 'serif' }) {
  return (
    <span className="text-lg leading-none" data-font-sample={font}>
      Ag
    </span>
  )
}

/** A tiny drawing of the window: sidebar attached to the edge, or floating with a gap. */
function SidebarPreview({ floating }: { floating: boolean }) {
  return (
    <span className="flex h-5 w-8 overflow-hidden rounded-[3px] border bg-background">
      <span className={cn('w-2 bg-muted-foreground/30', floating ? 'm-0.5 rounded-[2px]' : 'border-r')} />
    </span>
  )
}

function CornerPreview({ px }: { px: number }) {
  return (
    <span
      className="block size-5 border-t-2 border-l-2 border-current opacity-70"
      style={{ borderTopLeftRadius: Math.round(px * 1.1) }}
    />
  )
}

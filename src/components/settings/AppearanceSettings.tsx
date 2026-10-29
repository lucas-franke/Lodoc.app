import { Dices, FileText, Monitor, Moon, PanelLeft, Palette, RotateCcw, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Choice, OptionGroup, SectionBlock, StrengthSlider, SwitchRow } from '@/components/settings/controls'
import { useRootData } from '@/hooks/useRootData'
import { Button } from '@/components/ui/button'
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
  TEXTURES,
  TINTS,
  tintSwatchColor,
  type Appearance,
} from '@/lib/appearance'
import { showPaperTextureSamples } from '@/lib/paper-texture'
import { cn } from '@/lib/utils'

/** "Aa" at a size for each choice, smallest to largest */
const TEXT_SIZE_OPTIONS = [
  { id: 's', name: 'Small', sample: 12 },
  { id: 'm', name: 'Default', sample: 15 },
  { id: 'l', name: 'Large', sample: 19 },
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

  // The texture swatches below show the shader-rendered papers, not only the chosen one. They are drawn just
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
      <SectionBlock
        icon={Palette}
        title="Theme"
        onReset={isDefault('theme') ? undefined : () => resetSection('theme')}
      >
        <OptionGroup label="Mode">
          <Choice
            label="Color mode"
            value={(theme ?? 'system') as 'light' | 'dark' | 'system'}
            onChange={(v) => {
              setTheme(v)
              setUndo(null)
            }}
            options={[
              { value: 'light', name: 'Light', icon: <Sun />, ariaLabel: 'Light mode' },
              { value: 'dark', name: 'Dark', icon: <Moon />, ariaLabel: 'Dark mode' },
              { value: 'system', name: 'System', icon: <Monitor />, ariaLabel: 'Follow system' },
            ]}
          />
        </OptionGroup>
        <OptionGroup label="Tint">
          <Choice
            label="Tint"
            value={a.tint}
            onChange={choose('tint')}
            options={TINTS.map((t) => ({
              value: t.id,
              name: t.name,
              // A square in a fuller shade of the tint (the page colors themselves are too pale to tell apart at this
              // size, and a circle would read as a second radio dot)
              icon: (
                <span
                  className="size-4 rounded-[4px] border border-control-border"
                  style={{
                    backgroundColor: t.chroma
                      ? `oklch(${mode === 'dark' ? 0.55 : 0.78} ${t.chroma * 5} ${t.hue})`
                      : tintSwatchColor(t, mode),
                  }}
                />
              ),
            }))}
          />
        </OptionGroup>
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
        <OptionGroup label="Font">
          <Choice
            label="Page font"
            value={a.pageFont}
            onChange={choose('pageFont')}
            options={[
              { value: 'sans', name: 'Sans serif', icon: <FontSample font="sans" /> },
              { value: 'serif', name: 'Serif', icon: <FontSample font="serif" /> },
            ]}
          />
        </OptionGroup>
        <OptionGroup label="Text size">
          <Choice
            label="Text size"
            value={a.textSize}
            onChange={choose('textSize')}
            options={TEXT_SIZE_OPTIONS.map((s) => ({
              value: s.id,
              name: s.name,
              icon: (
                <span className="leading-none font-medium" data-font-sample={a.pageFont} style={{ fontSize: s.sample }}>
                  Aa
                </span>
              ),
            }))}
          />
        </OptionGroup>
        <SwitchRow
          id="ap-auto-cover"
          label="Automatic covers"
          hint="Notes without a chosen cover get a color gradient"
          checked={a.autoCover}
          onChange={(autoCover) => change({ autoCover })}
        />
        <OptionGroup label="Texture">
          <Choice
            label="Page texture"
            value={a.texture}
            onChange={choose('texture')}
            options={TEXTURES.map((t) => ({
              value: t.id,
              name: t.name,
              icon: <span data-texture-sample={t.id} className="block size-4 rounded-[3px] border border-control-border bg-background" />,
            }))}
          />
        </OptionGroup>
        {a.texture !== 'none' && (
          <OptionGroup label="Strength">
            <StrengthSlider
              label="Page texture strength"
              value={a.textureStrength}
              onChange={(textureStrength) => change({ textureStrength })}
            />
          </OptionGroup>
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
          <OptionGroup label="Sidebar">
            <Choice
              label="Sidebar style"
              value={a.sidebar}
              onChange={choose('sidebar')}
              options={[
                { value: 'connected', name: 'Connected', icon: <SidebarPreview floating={false} /> },
                { value: 'floating', name: 'Floating', icon: <SidebarPreview floating /> },
              ]}
            />
          </OptionGroup>
        )}
        <OptionGroup label="Corners">
          <Choice
            label="Corner style"
            value={a.corners}
            onChange={choose('corners')}
            options={RADIUS_PRESETS.map((p) => ({ value: p.id, name: p.name, icon: <CornerPreview px={p.px} /> }))}
          />
        </OptionGroup>
        <SwitchRow
          id="ap-ui-grain"
          label="Grain"
          hint="On the sidebar, menus and panels"
          checked={a.uiGrain}
          onChange={(uiGrain) => change({ uiGrain })}
        />
        {a.uiGrain && (
          <OptionGroup label="Intensity">
            <StrengthSlider
              label="Interface grain intensity"
              value={a.uiGrainStrength}
              onChange={(uiGrainStrength) => change({ uiGrainStrength })}
            />
          </OptionGroup>
        )}
      </SectionBlock>

      {/* At the end: the two that change everything above, each with its Undo beside it */}
      <div className="mt-8 flex flex-wrap items-center gap-2 border-t pt-5">
        <Button variant="ghost" size="sm" className="-ml-2.5" onClick={randomize}>
          <Dices /> Randomize
        </Button>
        {undoFor('Randomized')}
        <Button variant="ghost" size="sm" onClick={resetAll}>
          <RotateCcw /> Reset all appearance settings
        </Button>
        {undoFor('Back to defaults')}
      </div>
    </>
  )
}

function FontSample({ font }: { font: 'sans' | 'serif' }) {
  return (
    <span className="text-base leading-none font-medium" data-font-sample={font}>
      Ag
    </span>
  )
}

/** A tiny drawing of the window: sidebar attached to the edge, or floating with a gap. */
function SidebarPreview({ floating }: { floating: boolean }) {
  return (
    <span className="flex h-3.5 w-5 overflow-hidden rounded-[3px] border border-current">
      <span className={cn('w-1.5 bg-current opacity-40', floating ? 'm-px rounded-[1px]' : '')} />
    </span>
  )
}

function CornerPreview({ px }: { px: number }) {
  return <span className="block size-3.5 border-t-2 border-l-2 border-current" style={{ borderTopLeftRadius: Math.round(px * 0.7) }} />
}

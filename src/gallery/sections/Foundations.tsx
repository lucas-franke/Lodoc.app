import { FileText, Folder, LayoutGrid } from 'lucide-react'
import { RADIUS_PRESETS, TEXT_SIZES, TEXTURES, TINTS, tintColor } from '@/lib/appearance'
import { COVER_GRADIENTS, gradientStyle } from '@/lib/gradients'
import { CALLOUT_TONES, CALLOUT_INFO } from '@/lib/callout'
import { Caption, Example, Section } from '../Example'

/** The color tokens (styles/tokens.css), each with what it is for */
const COLORS = [
  ['background', 'The page'],
  ['foreground', 'Text'],
  ['muted-foreground', 'Secondary text, hints'],
  ['card', 'Cards'],
  ['popover', 'Menus, dialogs'],
  ['primary', 'The main button'],
  ['secondary', 'Quiet buttons'],
  ['muted', 'Quiet fills'],
  ['accent', 'Hovered rows'],
  ['border', 'Lines'],
  ['control-border', 'Outlines of controls (3:1)'],
  ['ring', 'Focus outlines'],
  ['destructive', 'Deleting'],
  ['sidebar', 'The sidebar'],
  ['joy', 'The accent: tint or gold'],
] as const

export function Foundations() {
  return (
    <Section id="foundations" title="Foundations" intro="The tokens everything else is built from. They follow the appearance: try another tint or dark mode under Appearance.">
      <Example id="colors" title="Colours" source="styles/tokens.css">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-4">
          {COLORS.map(([name, use]) => (
            <div key={name}>
              <div className="h-14 rounded-lg border" style={{ background: `var(--${name})` }} />
              <p className="mt-1.5 font-mono text-xs">--{name}</p>
              <Caption>{use}</Caption>
            </div>
          ))}
          {CALLOUT_TONES.map((tone) => (
            <div key={tone} data-callout-tone={tone}>
              <div className="flex h-14 items-center justify-center rounded-lg border bg-(--callout-fill)">
                <span className="size-4 rounded-full bg-(--callout-ink)" />
              </div>
              <p className="mt-1.5 font-mono text-xs">callout: {tone}</p>
              <Caption>{CALLOUT_INFO[tone].name}</Caption>
            </div>
          ))}
        </div>
        <h4 className="mt-8 mb-3 text-sm font-medium">Tints (the page colour, light and dark)</h4>
        <div className="flex flex-wrap gap-4">
          {TINTS.map((t) => (
            <div key={t.id} className="w-24">
              <div className="flex h-12 overflow-hidden rounded-lg border">
                <span className="flex-1" style={{ background: tintColor(t, 'light') }} />
                <span className="flex-1" style={{ background: tintColor(t, 'dark') }} />
              </div>
              <Caption>{t.name}</Caption>
            </div>
          ))}
        </div>
      </Example>

      <Example id="type" title="Type" source="index.css, styles/tokens.css">
        <div className="space-y-6">
          <div>
            <p className="text-2xl">Geist: the interface</p>
            <Caption>Menus, buttons, settings, the sidebar. Also notes, with the Sans page font.</Caption>
          </div>
          <div>
            <p className="font-serif text-2xl">
              Source Serif: <span className="italic">with its own italic</span>
            </p>
            <Caption>Notes with the Serif page font, and quotes in every note.</Caption>
          </div>
          <div>
            <p className="font-page text-4xl font-bold tracking-tight">A note's title</p>
            <Caption>In the page font, as chosen under Appearance</Caption>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2 font-page">
            {Object.entries(TEXT_SIZES).map(([id, size]) => (
              <span key={id} style={{ fontSize: size }}>
                Text {id.toUpperCase()} · {size}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-muted-foreground">
            <span className="text-sm">14 px for labels and rows</span>
            <span className="text-xs">12 px for hints and dates</span>
          </div>
        </div>
      </Example>

      <Example id="shapes" title="Corners and icons" source="lib/appearance-options.ts, styles/tokens.css">
        <div className="flex flex-wrap items-end gap-6">
          {RADIUS_PRESETS.map((r) => (
            <div key={r.id}>
              <div className="size-20 border-2 border-foreground/70 bg-muted" style={{ borderRadius: r.px }} />
              <Caption>
                {r.name} · {r.px}px
              </Caption>
            </div>
          ))}
          {(['sm', 'md', 'lg', 'xl', '2xl'] as const).map((r) => (
            <div key={r}>
              <div className="size-14 border bg-card" style={{ borderRadius: `var(--radius-${r})` }} />
              <Caption>rounded-{r}</Caption>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap items-end gap-8">
          {[
            ['--icon-sm', '16 px, long lists', FileText],
            ['--icon', '18 px, buttons and menus', Folder],
            ['--icon-lg', '20 px, page header', LayoutGrid],
          ].map(([size, use, Icon]) => {
            const I = Icon as typeof FileText
            return (
              <div key={size as string}>
                <I aria-hidden style={{ width: `var(${size})`, height: `var(${size})` }} />
                <Caption>
                  <code>{size as string}</code> · {use as string}
                </Caption>
              </div>
            )
          })}
        </div>
      </Example>

      <Example id="textures" title="Textures" source="index.css, lib/paper-texture.ts">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-4">
          {TEXTURES.map((t) => (
            <div key={t.id}>
              <div data-texture-sample={t.id} className="h-24 rounded-lg border bg-background" />
              <Caption>{t.name}</Caption>
            </div>
          ))}
        </div>
      </Example>

      <Example id="covers" title="Covers" source="lib/gradients.ts">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-4">
          {COVER_GRADIENTS.map((g) => (
            <div key={g.id}>
              <div className="cover-gradient h-16 rounded-lg" style={gradientStyle(g)} />
              <Caption>{g.name}</Caption>
            </div>
          ))}
        </div>
      </Example>
    </Section>
  )
}

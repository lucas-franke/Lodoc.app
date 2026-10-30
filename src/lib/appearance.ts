import { z } from 'zod'
import { showPaperTexture } from './paper-texture'
import { RADIUS_PRESETS, TEXTURE_STRENGTH_DEFAULT, TEXTURES, TINTS, type Tint } from './appearance-options'

export * from './appearance-options'

// Appearance settings: one object, remembered in this browser and applied to <html> as data attributes
// and CSS variables. index.css turns them into the look (tinted surfaces, gradient, floating sidebar, grain).

/** The page text size for each choice (Settings shows the names at these sizes) */
export const TEXT_SIZES = { s: '0.9375rem', m: '1rem', l: '1.125rem' } as const
/**
 * The desktop layout: wide enough for the sidebar beside the page, and tall enough too unless there is a mouse. Below
 * it (phones, and a phone held sideways) the sidebar lies over the page, so it stays connected there. The same query
 * as the wide and narrow variants in index.css.
 */
export const WIDE_SCREEN = '(min-width: 48rem) and (min-height: 32rem), (min-width: 48rem) and (pointer: fine)'

const schema = z.object({
  tint: z.enum(TINTS.map((t) => t.id) as [Tint, ...Tint[]]).catch('neutral'),
  gradient: z.boolean().catch(false),
  /** Text takes on a touch of the tint color */
  tintedText: z.boolean().catch(false),
  pageFont: z.enum(['sans', 'serif']).catch('sans'),
  textSize: z.enum(['s', 'm', 'l']).catch('m'),
  /** Notes without a chosen cover show a generated gradient (off: only covers the user picked) */
  autoCover: z.boolean().catch(true),
  sidebar: z.enum(['connected', 'floating']).catch('connected'),
  corners: z.enum(['sharp', 'rounded', 'round']).catch('rounded'),
  /** Grain and Linen were page textures until they were replaced; saved ones fall back to none */
  texture: z.enum(['none', 'paper', 'laid', 'dots']).catch('none'),
  textureStrength: z.number().int().min(0).max(100).catch(TEXTURE_STRENGTH_DEFAULT),
  /** Grain on the interface (sidebar, menus, panels), separate from the page texture */
  uiGrain: z.boolean().catch(false),
  uiGrainStrength: z.number().int().min(0).max(100).catch(TEXTURE_STRENGTH_DEFAULT),
  /** System follows prefers-contrast; "more" is high contrast */
  contrast: z.enum(['system', 'more', 'standard']).catch('system'),
  /** System follows prefers-reduced-motion; "full" animates even when the system asks for less */
  motion: z.enum(['system', 'reduce', 'full']).catch('system'),
})

/**
 * Earlier versions stored a free corner radius (px), a grain on/off switch (its texture no longer exists) and a
 * text color of neutral, the tint's or one of its own (now one switch that follows the tint)
 */
function migrate(saved: Record<string, unknown>): Record<string, unknown> {
  const out = { ...saved }
  if (typeof saved.radius === 'number' && !('corners' in saved))
    out.corners = saved.radius <= 4 ? 'sharp' : saved.radius <= 12 ? 'rounded' : 'round'
  if (typeof saved.textColor === 'string' && !('tintedText' in saved)) out.tintedText = saved.textColor !== 'neutral'
  delete out.radius
  delete out.grain
  delete out.textColor
  delete out.textTint
  return out
}

export type Appearance = z.infer<typeof schema>
export const DEFAULT_APPEARANCE: Appearance = schema.parse({})

/** Which settings each panel section owns (for "Reset" per section) */
export const APPEARANCE_SECTIONS = {
  theme: ['tint', 'gradient', 'tintedText'],
  pages: ['pageFont', 'textSize', 'autoCover', 'texture', 'textureStrength'],
  interface: ['sidebar', 'corners', 'uiGrain', 'uiGrainStrength'],
  accessibility: ['contrast', 'motion'],
} as const satisfies Record<string, readonly (keyof Appearance)[]>

/** Where the settings are kept; the website (site/) reads it too, to show pages in the same look */
export const APPEARANCE_KEY = 'localnotes:appearance'
/** The page font used to live in its own key (with a "mono" option that no longer exists) */
const OLD_FONT_KEY = 'localnotes:pageFont'

/** Settings as saved (here or in a backup file), including older forms; unknown or bad values become defaults */
export function parseAppearance(saved: Record<string, unknown>): Appearance {
  return schema.parse(migrate(saved))
}

export function readAppearance(): Appearance {
  try {
    const saved = JSON.parse(localStorage.getItem(APPEARANCE_KEY) ?? 'null') as Record<string, unknown> | null
    if (saved) return parseAppearance(saved)
    const oldFont = localStorage.getItem(OLD_FONT_KEY)
    return { ...DEFAULT_APPEARANCE, pageFont: oldFont === 'serif' ? 'serif' : 'sans' }
  } catch {
    return DEFAULT_APPEARANCE
  }
}

export function saveAppearance(settings: Appearance) {
  try {
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify(settings))
    localStorage.removeItem(OLD_FONT_KEY)
  } catch {
    // per-browser convenience only
  }
}

const MORE_CONTRAST = '(prefers-contrast: more)'
const LESS_MOTION = '(prefers-reduced-motion: reduce)'

let applied: Appearance | null = null

export function applyAppearance(a: Appearance) {
  const root = document.documentElement
  // Follow the window across the wide/narrow line (the floating sidebar only applies on wide screens), and the
  // system's contrast and motion settings for "System"
  if (!applied)
    for (const query of [WIDE_SCREEN, MORE_CONTRAST, LESS_MOTION])
      window.matchMedia(query).addEventListener('change', () => applied && applyAppearance(applied))
  applied = a
  const system = (query: string) => window.matchMedia(query).matches
  const high = a.contrast === 'system' ? system(MORE_CONTRAST) : a.contrast === 'more'
  root.dataset.contrast = high ? 'high' : 'standard'
  root.dataset.motion = (a.motion === 'system' ? system(LESS_MOTION) : a.motion === 'reduce') ? 'reduce' : 'full'
  // High contrast: no gradient behind the text, and textures and grain at less than half their strength
  const textureScale = high ? 0.4 : 1
  root.dataset.pageFont = a.pageFont
  root.dataset.tint = a.tint
  root.dataset.gradient = String(a.gradient && !high)
  root.dataset.sidebar = a.sidebar === 'floating' && window.matchMedia(WIDE_SCREEN).matches ? 'floating' : 'connected'
  root.dataset.texture = a.texture
  // The paper textures are rendered by a shader on first use; until then (or without WebGL) index.css shows a stand-in
  if (a.texture === 'paper' || a.texture === 'laid') showPaperTexture(a.texture)
  root.style.setProperty('--texture-strength', String((a.textureStrength / TEXTURE_STRENGTH_DEFAULT) * textureScale))
  root.dataset.uiGrain = String(a.uiGrain)
  root.style.setProperty('--ui-grain-strength', String((a.uiGrainStrength / TEXTURE_STRENGTH_DEFAULT) * textureScale))
  const tint = TINTS.find((t) => t.id === a.tint) ?? TINTS[0]
  root.style.setProperty('--tint-h', String(tint.hue))
  root.style.setProperty('--tint-c', String(tint.chroma))
  // Tinted text with a neutral page tint is simply neutral text
  root.dataset.textTint = a.tintedText ? tint.id : 'neutral'
  root.style.setProperty('--text-h', String(tint.hue))
  root.style.setProperty('--text-c', String(tint.chroma))
  const corners = RADIUS_PRESETS.find((p) => p.id === a.corners) ?? RADIUS_PRESETS[1]
  root.style.setProperty('--radius', `${corners.px / 16}rem`)
  root.style.setProperty('--page-text-size', TEXT_SIZES[a.textSize])
}

const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)]

/**
 * A random look for "Randomize": colors, fonts, texture and interface shape. Text size, generated covers,
 * strengths, contrast, motion and the light/dark mode stay as they are, since those are about reading comfort,
 * not style.
 */
export function randomAppearance(current: Appearance): Appearance {
  for (;;) {
    const tint = pick(TINTS).id
    const next: Appearance = {
      ...current,
      tint,
      gradient: Math.random() < 0.5,
      // Neutral text stays the most common, tinted text is the accent
      tintedText: Math.random() < 0.3,
      pageFont: pick(['sans', 'serif'] as const),
      texture: pick(TEXTURES).id,
      sidebar: pick(['connected', 'floating'] as const),
      corners: pick(RADIUS_PRESETS).id,
      uiGrain: Math.random() < 0.3,
    }
    const keys = Object.keys(next) as (keyof Appearance)[]
    if (keys.some((k) => next[k] !== current[k])) return next
  }
}

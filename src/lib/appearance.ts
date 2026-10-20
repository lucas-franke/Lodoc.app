import { z } from 'zod'
import { showPaperTexture } from './paper-texture'
import { APPEARANCE_KEY, RADIUS_PRESETS, TEXTURE_STRENGTH_DEFAULT, TEXTURES, TINTS, type Tint } from './appearance-options'

export * from './appearance-options'

// Appearance settings: one object, remembered in this browser and applied to <html> as data attributes
// and CSS variables. index.css turns them into the look (tinted surfaces, gradient, floating sidebar, grain).

const TEXT_SIZES = { s: '0.9375rem', m: '1rem', l: '1.125rem' } as const
/** The floating sidebar is a desktop look: on narrow screens the sidebar lies over the page, so it stays connected there */
export const WIDE_SCREEN = '(min-width: 48rem)'

const schema = z.object({
  tint: z.enum(TINTS.map((t) => t.id) as [Tint, ...Tint[]]).catch('neutral'),
  gradient: z.boolean().catch(false),
  textColor: z.enum(['neutral', 'tint', 'custom']).catch('neutral'),
  /** The text's own tint, used when textColor is "custom" */
  textTint: z.enum(TINTS.map((t) => t.id) as [Tint, ...Tint[]]).catch('sand'),
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
})

/** Earlier versions stored a free corner radius (px) and a grain on/off switch (its texture no longer exists) */
function migrate(saved: Record<string, unknown>): Record<string, unknown> {
  const out = { ...saved }
  if (typeof saved.radius === 'number' && !('corners' in saved))
    out.corners = saved.radius <= 4 ? 'sharp' : saved.radius <= 12 ? 'rounded' : 'round'
  delete out.radius
  delete out.grain
  return out
}

export type Appearance = z.infer<typeof schema>
export const DEFAULT_APPEARANCE: Appearance = schema.parse({})

/** Which settings each panel section owns (for "Reset" per section) */
export const APPEARANCE_SECTIONS = {
  theme: ['tint', 'gradient', 'textColor', 'textTint'],
  pages: ['pageFont', 'textSize', 'autoCover', 'texture', 'textureStrength'],
  interface: ['sidebar', 'corners', 'uiGrain', 'uiGrainStrength'],
} as const satisfies Record<string, readonly (keyof Appearance)[]>

const KEY = APPEARANCE_KEY
/** The page font used to live in its own key (with a "mono" option that no longer exists) */
const OLD_FONT_KEY = 'localnotes:pageFont'

/** Settings as saved (here or in a backup file), including older forms; unknown or bad values become defaults */
export function parseAppearance(saved: Record<string, unknown>): Appearance {
  return schema.parse(migrate(saved))
}

export function readAppearance(): Appearance {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Record<string, unknown> | null
    if (saved) return parseAppearance(saved)
    const oldFont = localStorage.getItem(OLD_FONT_KEY)
    return { ...DEFAULT_APPEARANCE, pageFont: oldFont === 'serif' ? 'serif' : 'sans' }
  } catch {
    return DEFAULT_APPEARANCE
  }
}

export function saveAppearance(settings: Appearance) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings))
    localStorage.removeItem(OLD_FONT_KEY)
  } catch {
    // per-browser convenience only
  }
}

let applied: Appearance | null = null

export function applyAppearance(a: Appearance) {
  const root = document.documentElement
  // Follow the window across the wide/narrow line (the floating sidebar only applies on wide screens)
  if (!applied) window.matchMedia(WIDE_SCREEN).addEventListener('change', () => applied && applyAppearance(applied))
  applied = a
  root.dataset.pageFont = a.pageFont
  root.dataset.tint = a.tint
  root.dataset.gradient = String(a.gradient)
  root.dataset.sidebar = a.sidebar === 'floating' && window.matchMedia(WIDE_SCREEN).matches ? 'floating' : 'connected'
  root.dataset.texture = a.texture
  // The paper textures are rendered by a shader on first use; until then (or without WebGL) index.css shows a stand-in
  if (a.texture === 'paper' || a.texture === 'laid') showPaperTexture(a.texture)
  root.style.setProperty('--texture-strength', String(a.textureStrength / TEXTURE_STRENGTH_DEFAULT))
  root.dataset.uiGrain = String(a.uiGrain)
  root.style.setProperty('--ui-grain-strength', String(a.uiGrainStrength / TEXTURE_STRENGTH_DEFAULT))
  const tint = TINTS.find((t) => t.id === a.tint) ?? TINTS[0]
  root.style.setProperty('--tint-h', String(tint.hue))
  root.style.setProperty('--tint-c', String(tint.chroma))
  // "Match tint" with a neutral page tint is simply neutral text
  const textTint = TINTS.find((t) => t.id === (a.textColor === 'tint' ? a.tint : a.textTint)) ?? TINTS[0]
  const textTintId = a.textColor === 'neutral' ? 'neutral' : textTint.id
  root.dataset.textTint = textTintId
  root.style.setProperty('--text-h', String(textTint.hue))
  root.style.setProperty('--text-c', String(textTint.chroma))
  const corners = RADIUS_PRESETS.find((p) => p.id === a.corners) ?? RADIUS_PRESETS[1]
  root.style.setProperty('--radius', `${corners.px / 16}rem`)
  root.style.setProperty('--page-text-size', TEXT_SIZES[a.textSize])
}

const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)]

/**
 * A random look for "Randomize": colors, fonts, texture and interface shape. Text size, generated covers,
 * strengths and the light/dark mode stay as they are, since those are about reading comfort, not style.
 */
export function randomAppearance(current: Appearance): Appearance {
  for (;;) {
    const tint = pick(TINTS).id
    const next: Appearance = {
      ...current,
      tint,
      gradient: Math.random() < 0.5,
      // Neutral text stays the most common, colored text is the accent
      textColor: pick(['neutral', 'neutral', 'tint', 'custom'] as const),
      textTint: pick(TINTS.filter((t) => t.id !== 'neutral')).id,
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

import { z } from 'zod'

// Appearance settings: one object, remembered in this browser and applied to <html> as data attributes
// and CSS variables. index.css turns them into the look (tinted surfaces, gradient, floating sidebar, grain).

/** Tints as oklch hue and chroma; index.css derives every surface color from --tint-h / --tint-c */
export const TINTS = [
  { id: 'neutral', name: 'Neutral', hue: 0, chroma: 0 },
  { id: 'sand', name: 'Sand', hue: 80, chroma: 0.02 },
  { id: 'rose', name: 'Rose', hue: 10, chroma: 0.018 },
  { id: 'sky', name: 'Sky', hue: 240, chroma: 0.018 },
  { id: 'sage', name: 'Sage', hue: 150, chroma: 0.018 },
  { id: 'lavender', name: 'Lavender', hue: 295, chroma: 0.02 },
] as const

export type Tint = (typeof TINTS)[number]['id']

/** The page background a tint produces (same numbers as the --background rules in index.css) */
export function tintColor(t: (typeof TINTS)[number], mode: 'light' | 'dark') {
  if (t.id === 'neutral') return mode === 'light' ? 'oklch(1 0 0)' : 'oklch(0.145 0 0)'
  return mode === 'light' ? `oklch(0.985 ${t.chroma} ${t.hue})` : `oklch(0.17 ${t.chroma * 0.8} ${t.hue})`
}

export const RADIUS_PRESETS = [
  { id: 'sharp', name: 'Sharp', px: 0 },
  { id: 'rounded', name: 'Rounded', px: 10 },
  { id: 'round', name: 'Round', px: 16 },
] as const
export type Corners = (typeof RADIUS_PRESETS)[number]['id']

export const TEXTURES = [
  { id: 'none', name: 'None' },
  { id: 'grain', name: 'Grain' },
  { id: 'paper', name: 'Paper' },
  { id: 'linen', name: 'Linen' },
] as const
export type Texture = (typeof TEXTURES)[number]['id']
/** Texture strength in percent; 50 is each texture's tuned default, 100 twice as strong */
export const TEXTURE_STRENGTH_DEFAULT = 50

const TEXT_SIZES = { s: '0.9375rem', m: '1rem', l: '1.125rem' } as const
/** The floating sidebar is a desktop look: on narrow screens the sidebar lies over the page, so it stays connected there */
export const WIDE_SCREEN = '(min-width: 48rem)'

const schema = z.object({
  tint: z.enum(TINTS.map((t) => t.id) as [Tint, ...Tint[]]).catch('neutral'),
  gradient: z.boolean().catch(false),
  pageFont: z.enum(['sans', 'serif']).catch('sans'),
  textSize: z.enum(['s', 'm', 'l']).catch('m'),
  /** Notes without a chosen cover show a generated gradient (off: only covers the user picked) */
  autoCover: z.boolean().catch(true),
  sidebar: z.enum(['connected', 'floating']).catch('connected'),
  corners: z.enum(['sharp', 'rounded', 'round']).catch('rounded'),
  texture: z.enum(['none', 'grain', 'paper', 'linen']).catch('none'),
  textureStrength: z.number().int().min(0).max(100).catch(TEXTURE_STRENGTH_DEFAULT),
  /** Grain on the interface (sidebar, menus, panels), separate from the page texture */
  uiGrain: z.boolean().catch(false),
  uiGrainStrength: z.number().int().min(0).max(100).catch(TEXTURE_STRENGTH_DEFAULT),
})

/** Earlier versions stored a free corner radius (px) and a grain on/off switch */
function migrate(saved: Record<string, unknown>): Record<string, unknown> {
  const out = { ...saved }
  if (typeof saved.radius === 'number' && !('corners' in saved))
    out.corners = saved.radius <= 4 ? 'sharp' : saved.radius <= 12 ? 'rounded' : 'round'
  if (typeof saved.grain === 'boolean' && !('texture' in saved)) out.texture = saved.grain ? 'grain' : 'none'
  delete out.radius
  delete out.grain
  return out
}

export type Appearance = z.infer<typeof schema>
export const DEFAULT_APPEARANCE: Appearance = schema.parse({})

/** Which settings each panel section owns (for "Reset" per section) */
export const APPEARANCE_SECTIONS = {
  theme: ['tint', 'gradient'],
  pages: ['pageFont', 'textSize', 'autoCover', 'texture', 'textureStrength'],
  interface: ['sidebar', 'corners', 'uiGrain', 'uiGrainStrength'],
} as const satisfies Record<string, readonly (keyof Appearance)[]>

const KEY = 'localnotes:appearance'
/** The page font used to live in its own key (with a "mono" option that no longer exists) */
const OLD_FONT_KEY = 'localnotes:pageFont'

export function readAppearance(): Appearance {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Record<string, unknown> | null
    if (saved) return schema.parse(migrate(saved))
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
  root.style.setProperty('--texture-strength', String(a.textureStrength / TEXTURE_STRENGTH_DEFAULT))
  root.dataset.uiGrain = String(a.uiGrain)
  root.style.setProperty('--ui-grain-strength', String(a.uiGrainStrength / TEXTURE_STRENGTH_DEFAULT))
  const tint = TINTS.find((t) => t.id === a.tint) ?? TINTS[0]
  root.style.setProperty('--tint-h', String(tint.hue))
  root.style.setProperty('--tint-c', String(tint.chroma))
  const corners = RADIUS_PRESETS.find((p) => p.id === a.corners) ?? RADIUS_PRESETS[1]
  root.style.setProperty('--radius', `${corners.px / 16}rem`)
  root.style.setProperty('--page-text-size', TEXT_SIZES[a.textSize])
}

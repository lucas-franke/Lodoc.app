// The choices in the Appearance panel (tints, textures, corners…), without anything else: the website's
// appearance demo uses them too (site/), so it offers exactly what the app does. lib/appearance.ts re-exports
// them along with the stored settings.

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

/**
 * A tint's swatch in the Appearance panel (and the website's demo). In light mode the page colour itself; in dark
 * mode a lighter, more saturated version of its hue, since the tinted darks are all too close to black to tell
 * apart. Only the swatch: the page keeps the colours above.
 */
export function tintSwatchColor(t: (typeof TINTS)[number], mode: 'light' | 'dark') {
  if (mode === 'light') return tintColor(t, 'light')
  if (t.id === 'neutral') return 'oklch(0.32 0 0)'
  return `oklch(0.42 ${t.chroma * 4} ${t.hue})`
}

export const RADIUS_PRESETS = [
  { id: 'sharp', name: 'Sharp', px: 0 },
  { id: 'rounded', name: 'Rounded', px: 10 },
  { id: 'round', name: 'Round', px: 16 },
] as const
export type Corners = (typeof RADIUS_PRESETS)[number]['id']

export const TEXTURES = [
  { id: 'none', name: 'None' },
  { id: 'paper', name: 'Paper' },
  { id: 'laid', name: 'Laid paper' },
  { id: 'dots', name: 'Dot grid' },
] as const
export type Texture = (typeof TEXTURES)[number]['id']
/** Texture strength in percent; 50 is each texture's tuned default, 100 twice as strong */
export const TEXTURE_STRENGTH_DEFAULT = 50

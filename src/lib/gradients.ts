import type { CSSProperties } from 'react'

/**
 * The fixed palette for generated note covers. Ids are stored in notes, so never reuse or rename one (names and
 * colors may change). Calm tones, so a grid of covers doesn't shout: each has a pair for light mode and a darker,
 * less saturated pair for dark mode, where light colors would glow.
 */
export const COVER_GRADIENTS = [
  { id: 'sunset', name: 'Sunset', light: ['oklch(0.83 0.07 45)', 'oklch(0.75 0.08 28)'], dark: ['oklch(0.61 0.056 45)', 'oklch(0.58 0.064 28)'] },
  { id: 'sunrise', name: 'Sunrise', light: ['oklch(0.89 0.07 85)', 'oklch(0.81 0.08 58)'], dark: ['oklch(0.64 0.056 85)', 'oklch(0.6 0.064 58)'] },
  { id: 'rose', name: 'Rose', light: ['oklch(0.86 0.05 10)', 'oklch(0.92 0.03 20)'], dark: ['oklch(0.62 0.04 10)', 'oklch(0.65 0.024 20)'] },
  { id: 'lavender', name: 'Lavender', light: ['oklch(0.82 0.06 300)', 'oklch(0.89 0.045 335)'], dark: ['oklch(0.61 0.048 300)', 'oklch(0.64 0.036 335)'] },
  { id: 'orchid', name: 'Orchid', light: ['oklch(0.7 0.08 300)', 'oklch(0.6 0.09 285)'], dark: ['oklch(0.56 0.064 300)', 'oklch(0.52 0.072 285)'] },
  { id: 'ocean', name: 'Ocean', light: ['oklch(0.74 0.07 228)', 'oklch(0.86 0.05 212)'], dark: ['oklch(0.58 0.056 228)', 'oklch(0.62 0.04 212)'] },
  { id: 'lagoon', name: 'Lagoon', light: ['oklch(0.78 0.07 172)', 'oklch(0.62 0.06 238)'], dark: ['oklch(0.59 0.056 172)', 'oklch(0.53 0.048 238)'] },
  { id: 'meadow', name: 'Meadow', light: ['oklch(0.91 0.08 125)', 'oklch(0.85 0.07 150)'], dark: ['oklch(0.64 0.064 125)', 'oklch(0.62 0.056 150)'] },
  { id: 'slate', name: 'Slate', light: ['oklch(0.68 0.025 250)', 'oklch(0.6 0.03 255)'], dark: ['oklch(0.55 0.02 250)', 'oklch(0.52 0.024 255)'] },
  { id: 'midnight', name: 'Midnight', light: ['oklch(0.42 0.05 275)', 'oklch(0.34 0.04 265)'], dark: ['oklch(0.45 0.04 275)', 'oklch(0.42 0.032 265)'] },
] as const

export type Gradient = (typeof COVER_GRADIENTS)[number]

const hash = (text: string) => [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)

/** The gradient with this id; an unknown id (e.g. from a newer palette) falls back to one picked from the id text. */
export function gradientById(id: string): Gradient {
  return COVER_GRADIENTS.find((g) => g.id === id) ?? COVER_GRADIENTS[hash(id) % COVER_GRADIENTS.length]
}

/** The gradient a note gets until someone picks another cover: always the same one for the same note. */
export const defaultGradient = (noteId: string): Gradient => COVER_GRADIENTS[hash(noteId) % COVER_GRADIENTS.length]

/** Colors for an element with the `cover-gradient` class (index.css draws them, light or dark) */
export const gradientStyle = (g: Gradient) =>
  ({
    '--cover-from': g.light[0],
    '--cover-to': g.light[1],
    '--cover-from-dark': g.dark[0],
    '--cover-to-dark': g.dark[1],
  }) as CSSProperties

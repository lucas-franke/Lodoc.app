import { useSyncExternalStore } from 'react'
import { applyAppearance, DEFAULT_APPEARANCE, readAppearance, saveAppearance, type Appearance } from '@/lib/appearance'

// A tiny shared store: the panel, the sidebar button and anything else read the same settings.
let current: Appearance = readAppearance()
const listeners = new Set<() => void>()

function set(next: Appearance) {
  current = next
  applyAppearance(next)
  saveAppearance(next)
  listeners.forEach((l) => l())
}

export const updateAppearance = (patch: Partial<Appearance>) => set({ ...current, ...patch })
export const resetAppearance = () => set(DEFAULT_APPEARANCE)
/** Back to the defaults for some settings only (one panel section) */
export const resetAppearanceKeys = (keys: readonly (keyof Appearance)[]) =>
  set({ ...current, ...Object.fromEntries(keys.map((k) => [k, DEFAULT_APPEARANCE[k]])) })
export const getAppearance = () => current

/** Applies the saved settings to <html>; called before the first render so nothing jumps. */
export const applySavedAppearance = () => applyAppearance(current)

export function useAppearance(): Appearance {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => current,
  )
}

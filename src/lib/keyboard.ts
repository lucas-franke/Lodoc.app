/** Apple keyboards: ⌘ and ⌥ instead of Ctrl and Alt (the shortcuts themselves accept both) */
export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)

/** One key's name as written on this keyboard: "Ctrl" is ⌘ and "Alt" is ⌥ on a Mac */
export const keyLabel = (key: string) => (isMac ? ({ Ctrl: '⌘', Alt: '⌥' } as Record<string, string>)[key] ?? key : key)

/** A shortcut written as "Ctrl Alt N", for this keyboard ("⌘ ⌥ N" on a Mac) */
export const shortcutLabel = (shortcut: string) => shortcut.split(' ').map(keyLabel).join(' ')

/** Touch screens: where an on-screen keyboard appears for text fields */
export const isTouchScreen = () => window.matchMedia('(pointer: coarse)').matches

/**
 * Phones only open the on-screen keyboard for a text field focused during the tap itself, but inline
 * fields (e.g. renaming in the sidebar) appear a moment later. Call this in the tap's handler: a hidden
 * field takes focus right away so the keyboard opens, and hands it over when the real field focuses.
 * Nothing happens on devices without a touch screen.
 */
export function holdKeyboard() {
  if (!isTouchScreen()) return
  const proxy = document.createElement('input')
  proxy.setAttribute('aria-hidden', 'true')
  proxy.tabIndex = -1
  // 16px keeps iOS from zooming in; fixed at the top so focusing doesn't scroll anything
  Object.assign(proxy.style, { position: 'fixed', top: '0', left: '0', width: '1px', height: '1px', opacity: '0', fontSize: '16px', pointerEvents: 'none' })
  document.body.appendChild(proxy)
  proxy.focus({ preventScroll: true })
  proxy.addEventListener('blur', () => proxy.remove(), { once: true })
  // If no field took over, let the keyboard close again
  window.setTimeout(() => (document.activeElement === proxy ? proxy.blur() : proxy.remove()), 1500)
}

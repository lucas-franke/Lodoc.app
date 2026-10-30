// Light, dark or the system's: one setting with the app (next-themes keeps it in localStorage.theme, with these
// values), so switching here switches the app too. The inline script in Base.astro applies it before the first paint;
// this keeps it in step afterwards and lets the toggle and the Custom panel change it.

export type Theme = 'light' | 'dark' | 'system'
const KEY = 'theme'
const DARK = '(prefers-color-scheme: dark)'
const EVENT = 'lodoc:theme'

export function getTheme(): Theme {
  try {
    const saved = localStorage.getItem(KEY)
    return saved === 'light' || saved === 'dark' ? saved : 'system'
  } catch {
    return 'system'
  }
}

function show(theme: Theme) {
  const dark = theme === 'dark' || (theme === 'system' && matchMedia(DARK).matches)
  document.documentElement.classList.toggle('dark', dark)
}

/** Keeps it and tells the other controls on the page (the header toggle, the Custom panel) */
export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    // per-browser convenience only
  }
  show(theme)
  window.dispatchEvent(new CustomEvent<Theme>(EVENT, { detail: theme }))
}

/** Calls back with the theme whenever it changes, on this page or in another tab */
export function onThemeChange(callback: (theme: Theme) => void) {
  window.addEventListener(EVENT, (e) => callback((e as CustomEvent<Theme>).detail))
  window.addEventListener('storage', (e) => e.key === KEY && callback(getTheme()))
}

/** Keeps the page in step: with the device while on System, and with a change made in another tab (the app) */
export function followTheme() {
  matchMedia(DARK).addEventListener('change', () => getTheme() === 'system' && show('system'))
  window.addEventListener('storage', (e) => e.key === KEY && show(getTheme()))
}

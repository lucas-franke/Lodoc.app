import { applyAppearance, type Appearance } from '../../../src/lib/appearance'

/**
 * Shows a look on the page: the app's own applyAppearance, plus the website's top bar, which floats whenever the
 * sidebar is set to float. (The app's sidebar stays attached on phones, where it lies over the page; the website's bar
 * floats on every screen.)
 */
export function showLook(look: Appearance) {
  applyAppearance(look)
  document.documentElement.dataset.siteNav = look.sidebar === 'floating' ? 'floating' : 'attached'
}

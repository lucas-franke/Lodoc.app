import { applyAppearance, TEXT_SIZES, type Appearance } from '../../../src/lib/appearance'

/**
 * Shows a look on the page: the app's own applyAppearance, plus the website's top bar, which floats whenever the
 * sidebar is set to float. (The app's sidebar stays attached on phones, where it lies over the page; the website's bar
 * floats on every screen.) The reading text follows Text size.
 */
export function showLook(look: Appearance) {
  applyAppearance(look)
  document.documentElement.dataset.siteNav = look.sidebar === 'floating' ? 'floating' : 'attached'
  // The reading text follows Text size (site.css, .page-scaled)
  document.documentElement.style.setProperty('--page-scale', String(parseFloat(TEXT_SIZES[look.textSize])))
}

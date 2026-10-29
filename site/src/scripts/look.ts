import { APPEARANCE_KEY, applyAppearance, readAppearance } from '../../../src/lib/appearance'
import { followThemeColor } from '../../../src/lib/theme-color'
import { followTheme } from './theme'

// Every page of the website in the look chosen in the app. The inline script in Base.astro sets it before the first
// paint; this runs the app's own applyAppearance on top, which also draws the paper textures and follows the window
// across the wide/narrow line (the floating navigation) and the system's contrast setting.

applyAppearance(readAppearance())
followTheme()
// The phone's status bar in the page's colour, tint and dark mode included
followThemeColor()
// Changed in the app in another tab
window.addEventListener('storage', (e) => {
  if (e.key === APPEARANCE_KEY) applyAppearance(readAppearance())
})

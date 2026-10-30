import { APPEARANCE_KEY, readAppearance } from '../../../src/lib/appearance'
import { followThemeColor } from '../../../src/lib/theme-color'
import { showLook } from './show-look'
import { followTheme } from './theme'

// Every page of the website in the look chosen in the app. The inline script in Base.astro sets it before the first
// paint; this runs the app's own applyAppearance on top (show-look.ts), which also draws the paper textures and
// follows the system's contrast setting.

showLook(readAppearance())
followTheme()
// The phone's status bar in the page's colour, tint and dark mode included
followThemeColor()
// Changed in the app in another tab
window.addEventListener('storage', (e) => {
  if (e.key === APPEARANCE_KEY) showLook(readAppearance())
})

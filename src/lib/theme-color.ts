// The phone's status bar (and an installed app's title bar) takes its color from <meta name="theme-color">.
// index.html has plain light/dark values for the first paint; from then on it follows the page background,
// so a tint or dark mode shows up there too instead of a slightly different grey.

/** The color as rgb(), since theme-color doesn't understand oklch everywhere */
function toRgb(color: string) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 1
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = color
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  return `rgb(${r}, ${g}, ${b})`
}

function sync() {
  const rgb = toRgb(getComputedStyle(document.body).backgroundColor)
  if (!rgb) return
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    if (meta.content !== rgb) meta.content = rgb
  }
}

/** Keeps theme-color in step with the background: theme (class) and appearance (data attributes, variables) */
export function followThemeColor() {
  let frame = 0
  const schedule = () => {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(sync)
  }
  new MutationObserver(schedule).observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-tint', 'data-gradient'] })
  schedule()
}

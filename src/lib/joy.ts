// Small moments of delight ("sparks of joy"). Each is short and quiet, and none happens when the system asks
// for reduced motion. The colour is --joy (index.css): the tint's hue, or a warm gold without a tint.

import { flushSync } from 'react-dom'

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** A few dots that drift up from a point and fade, once (about 0.8 s) */
export function burst(x: number, y: number, count = 7) {
  if (reducedMotion()) return
  for (let i = 0; i < count; i++) {
    const dot = document.createElement('span')
    dot.className = 'joy-dot'
    dot.setAttribute('aria-hidden', 'true')
    // Spread over a fan above the point, each a little different
    const angle = (-90 + (i - (count - 1) / 2) * (100 / count) + (Math.random() - 0.5) * 12) * (Math.PI / 180)
    const distance = 22 + Math.random() * 18
    dot.style.left = `${x}px`
    dot.style.top = `${y}px`
    dot.style.setProperty('--dx', `${Math.cos(angle) * distance}px`)
    dot.style.setProperty('--dy', `${Math.sin(angle) * distance - 8}px`)
    dot.style.animationDelay = `${i * 18}ms`
    dot.addEventListener('animationend', () => dot.remove())
    document.body.appendChild(dot)
  }
}

/** A change of the whole look that crossfades in (View Transitions; a plain switch where they aren't supported) */
export function crossfade(update: () => void) {
  if (reducedMotion() || !document.startViewTransition) return update()
  document.startViewTransition(() => flushSync(update))
}

/** Plays a CSS animation class on an element once (restarting it if it is still running) */
export function playOnce(element: Element, className: string) {
  if (reducedMotion()) return
  element.classList.remove(className)
  // Reading layout restarts the animation when the class comes straight back
  void (element as HTMLElement).offsetWidth
  element.classList.add(className)
  element.addEventListener('animationend', () => element.classList.remove(className), { once: true })
}

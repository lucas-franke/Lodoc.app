import { useEffect, useState } from 'react'

/** A data attribute on <html>, kept current (lib/appearance.ts sets them) */
export function useRootData(name: string) {
  const [value, setValue] = useState(() => document.documentElement.dataset[name])
  useEffect(() => {
    const observer = new MutationObserver(() => setValue(document.documentElement.dataset[name]))
    observer.observe(document.documentElement, { attributeFilter: [`data-${name}`] })
    return () => observer.disconnect()
  }, [name])
  return value
}

/** Whether a media query matches, kept current */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const list = window.matchMedia(query)
    const update = () => setMatches(list.matches)
    list.addEventListener('change', update)
    return () => list.removeEventListener('change', update)
  }, [query])
  return matches
}

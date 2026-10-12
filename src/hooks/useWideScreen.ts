import { useSyncExternalStore } from 'react'
import { WIDE_SCREEN } from '@/lib/appearance'

/** True on screens where the floating sidebar applies (see WIDE_SCREEN) */
export function useWideScreen() {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(WIDE_SCREEN)
      query.addEventListener('change', onChange)
      return () => query.removeEventListener('change', onChange)
    },
    () => window.matchMedia(WIDE_SCREEN).matches,
  )
}

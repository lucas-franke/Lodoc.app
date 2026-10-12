import { useState } from 'react'

const KEY = 'localnotes:minimap'

/** Whether boards show the minimap; remembered in this browser (off by default) */
export function useMinimapSetting() {
  const [on, setOn] = useState(() => {
    try {
      return localStorage.getItem(KEY) === '1'
    } catch {
      return false
    }
  })
  const set = (next: boolean) => {
    setOn(next)
    try {
      localStorage.setItem(KEY, next ? '1' : '0')
    } catch {
      // Not remembered, but still works for this visit
    }
  }
  return [on, set] as const
}

import { useState } from 'react'

const PREFIX = 'localnotes:section-closed:'

/** Whether a card section (overview, folder, tag pages) is open; a closed one stays closed in this browser */
export function useSectionOpen(key: string) {
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(PREFIX + key) !== '1'
    } catch {
      return true
    }
  })
  const change = (next: boolean) => {
    setOpen(next)
    try {
      if (next) localStorage.removeItem(PREFIX + key)
      else localStorage.setItem(PREFIX + key, '1')
    } catch {
      // per-browser convenience only
    }
  }
  return [open, change] as const
}

import { useSyncExternalStore } from 'react'
import { dayKey } from './format'

// The days something was written (a spark of joy: the row of dots on the overview). Only a look back: no
// streaks, nothing to keep up. Kept per device for the last few weeks; notes' last edits fill in the rest.

const KEY = 'localnotes:writingDays'
const CHANGED = 'localnotes:writing-days-changed'
const KEEP_DAYS = 31

let cache: string | null = null

function read(): string {
  if (cache === null) {
    try {
      cache = localStorage.getItem(KEY) ?? '[]'
    } catch {
      cache = '[]'
    }
  }
  return cache
}

/** Notes that today saw writing (called on every save; only the first one of a day writes anything) */
export function noteWritingDay(time = Date.now()) {
  const today = dayKey(time)
  const days: string[] = JSON.parse(read())
  if (days.includes(today)) return
  const oldest = dayKey(time - KEEP_DAYS * 24 * 60 * 60 * 1000)
  cache = JSON.stringify([...days.filter((d) => d > oldest), today])
  try {
    localStorage.setItem(KEY, cache)
  } catch {
    // shown for this visit only
  }
  window.dispatchEvent(new Event(CHANGED))
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGED, onChange)
  return () => window.removeEventListener(CHANGED, onChange)
}

/** The recorded writing days, as day keys ("2026-10-20") */
export function useWritingDays(): string[] {
  return JSON.parse(useSyncExternalStore(subscribe, read, () => '[]')) as string[]
}

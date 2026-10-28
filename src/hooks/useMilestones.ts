import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { db } from '@/db/db'
import { notify } from '@/lib/notify'
import { isListed } from '@/db/notes'

// A quiet word at a few milestones (a spark of joy): the 10th, 100th… note, and each year since the first one.
// Each is said once; the ones already passed when this is first seen (or after an import) are noted silently.

const KEY = 'localnotes:milestones'
const YEAR = 365 * 24 * 60 * 60 * 1000

const NOTE_MILESTONES: [number, string][] = [
  [10, '10 notes. A good start.'],
  [50, "50 notes. It's becoming a habit."],
  [100, "100 notes. That's a library."],
  [250, '250 notes. Quite the collection.'],
  [500, '500 notes. A whole archive.'],
  [1000, '1,000 notes. Wow.'],
]

function reached(): Set<string> | null {
  try {
    const saved = localStorage.getItem(KEY)
    return saved ? new Set(JSON.parse(saved) as string[]) : null
  } catch {
    return new Set() // no storage: say nothing rather than repeat
  }
}

function remember(keys: Set<string>) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...keys]))
  } catch {
    // said again next time at most
  }
}

export function useMilestones() {
  const count = useLiveQuery(() => db.notes.filter(isListed).count())
  // When the first note was written: read once (not on every save), for the yearly word
  const [firstCreated, setFirstCreated] = useState<number>()
  useEffect(() => {
    let first = Infinity
    void db.notes.each((n) => void (first = Math.min(first, n.createdAt))).then(() => setFirstCreated(first))
  }, [])

  // The count when last looked at: a note milestone is only celebrated when one note was just added (not on
  // start, where notes from elsewhere may already be in, nor after an import that brought many at once)
  const lastCount = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (count === undefined || firstCreated === undefined) return
    const justWrote = lastCount.current !== undefined && count === lastCount.current + 1
    lastCount.current = count
    const years = Number.isFinite(firstCreated) ? Math.floor((Date.now() - firstCreated) / YEAR) : 0
    const notes = NOTE_MILESTONES.filter(([n]) => count >= n).map(([n, text]) => ({ key: `notes:${n}`, text }))
    const year =
      years >= 1
        ? [{ key: `year:${years}`, text: years === 1 ? 'One year of notes here. Thanks for writing.' : `${years} years of notes here.` }]
        : []
    const known = reached()
    if (!known) {
      // First time: what has been reached already counts as said
      remember(new Set([...notes, ...year].map((d) => d.key)))
      return
    }
    const fresh = [...notes, ...year].filter((d) => !known.has(d.key))
    if (!fresh.length) return
    for (const d of fresh) known.add(d.key)
    remember(known)
    const say = [...(justWrote ? notes : []), ...year].filter((d) => fresh.includes(d))
    // Only the biggest news, if several arrive at once
    if (say.length) notify(say[say.length - 1].text, { level: 'success' })
  }, [count, firstCreated])
}

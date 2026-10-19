import { useState } from 'react'
import type { Note } from '@/db/schema'
import { dayKey, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useWritingDays } from '@/lib/writing-days'

const weekday = new Intl.DateTimeFormat('en', { weekday: 'short' })

/** Seven quiet dots for the last seven days, filled where something was written. Only a look back, no streak. */
export function WritingDays({ notes }: { notes: Note[] }) {
  const recorded = useWritingDays()
  const [today] = useState(() => new Date())
  // Days recorded on this device, plus each note's last edit (so the row isn't empty on a new device)
  const written = new Set([...recorded, ...notes.map((n) => dayKey(n.updatedAt))])
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(today)
    day.setDate(day.getDate() - (6 - i))
    return day
  })
  const count = days.filter((d) => written.has(dayKey(d))).length
  return (
    <div role="img" aria-label={`Written on ${count} of the last 7 days`} className="flex items-center gap-1.5" data-writing-days>
      {days.map((day, i) => {
        const wrote = written.has(dayKey(day))
        return (
          <span
            key={dayKey(day)}
            title={`${weekday.format(day)}, ${formatDate(day)}${wrote ? ': written' : ''}`}
            className={cn(
              'size-2 rounded-full',
              wrote ? 'bg-(--joy)' : 'border border-muted-foreground/40',
              // Today: a ring around it
              i === 6 && 'ring-1 ring-muted-foreground/50 ring-offset-2 ring-offset-background',
            )}
          />
        )
      })}
    </div>
  )
}

import { useLayoutEffect, useRef, useState } from 'react'

/** Inline name editor: Enter/blur saves, Escape cancels (onDone(null)). */
export function RenameInput({ initial, onDone }: { initial: string; onDone: (name: string | null) => void }) {
  const [value, setValue] = useState(initial)
  const ref = useRef<HTMLInputElement>(null)
  const done = useRef(false)
  const finish = (name: string | null) => {
    if (done.current) return
    done.current = true
    onDone(name)
  }

  useLayoutEffect(() => {
    // Right away, so a phone keeps the keyboard that was opened for it (holdKeyboard); again a moment later
    // in case a closing menu pulled focus back to its button
    const focus = () => {
      ref.current?.focus()
      ref.current?.select()
    }
    focus()
    const t = window.setTimeout(focus, 50)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <input
      ref={ref}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onBlur={() => finish(value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') finish(value)
        if (e.key === 'Escape') finish(null)
      }}
      className="h-7 min-w-0 flex-1 rounded-md border border-input bg-background px-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    />
  )
}

import { Palette } from 'lucide-react'
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useAppEvent } from '@/lib/app-events'

// The panel (and its slider/switch/toggle components) is only loaded once it is opened
const AppearancePanel = lazy(() =>
  import('@/components/appearance/AppearancePanel').then((m) => ({ default: m.AppearancePanel })),
)

/** Sidebar footer control that opens the Appearance panel. */
export function AppearanceMenu() {
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)

  // The command palette can open the panel too
  useAppEvent(
    'open-appearance',
    useCallback(() => {
      setLoaded(true)
      setOpen(true)
    }, []),
  )

  // Lets the page make room for the panel on wide screens (index.css)
  useEffect(() => {
    document.documentElement.toggleAttribute('data-appearance-open', open)
    return () => document.documentElement.removeAttribute('data-appearance-open')
  }, [open])

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-haspopup="dialog"
        onClick={() => {
          setLoaded(true)
          setOpen(true)
        }}
        className="flex min-h-11 w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring/60 aria-expanded:bg-sidebar-accent"
        aria-expanded={open}
      >
        <Palette className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate">Appearance</span>
      </button>
      {loaded && (
        <Suspense fallback={null}>
          <AppearancePanel open={open} onOpenChange={setOpen} returnFocus={() => trigger.current?.focus()} />
        </Suspense>
      )}
    </>
  )
}

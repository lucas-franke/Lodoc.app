import { Palette } from 'lucide-react'
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Tip } from '@/components/Tip'
import { Button } from '@/components/ui/button'
import { emitAppEvent, useAppEvent } from '@/lib/app-events'

// The panel (and its slider/switch/toggle components) is only loaded once it is opened
const AppearancePanel = lazy(() =>
  import('@/components/appearance/AppearancePanel').then((m) => ({ default: m.AppearancePanel })),
)

/** The page header's button for Appearance (light and dark live in there too). */
export function AppearanceButton() {
  return (
    <Tip label="Appearance">
      <Button variant="ghost" size="icon-sm" aria-label="Appearance" aria-haspopup="dialog" onClick={() => emitAppEvent('open-appearance')}>
        <Palette />
      </Button>
    </Tip>
  )
}

/** Holds the Appearance panel, opened by the header button or the command palette. */
export function AppearanceMenu() {
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  // Focus goes back where it was (the header button), since the panel has no trigger of its own
  const opener = useRef<HTMLElement | null>(null)

  useAppEvent(
    'open-appearance',
    useCallback(() => {
      opener.current = document.activeElement as HTMLElement | null
      setLoaded(true)
      setOpen(true)
    }, []),
  )

  // Lets the page make room for the panel on wide screens (index.css)
  useEffect(() => {
    document.documentElement.toggleAttribute('data-appearance-open', open)
    return () => document.documentElement.removeAttribute('data-appearance-open')
  }, [open])

  return loaded ? (
    <Suspense fallback={null}>
      <AppearancePanel open={open} onOpenChange={setOpen} returnFocus={() => opener.current?.isConnected && opener.current.focus()} />
    </Suspense>
  ) : null
}

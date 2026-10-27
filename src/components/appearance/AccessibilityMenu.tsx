import { useEffect, useState } from 'react'
import { UniversalAccess } from '@/components/icons/UniversalAccess'
import { Tip } from '@/components/Tip'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { updateAppearance, useAppearance } from '@/hooks/useAppearance'
import type { Appearance } from '@/lib/appearance'

/**
 * The page header's Accessibility menu: contrast and motion, each following the system or set for Lodoc.
 * It stays open while choosing, so the change shows at once and both can be set in one go.
 */
export function AccessibilityMenu() {
  const a = useAppearance()
  const systemHigh = useMediaQuery('(prefers-contrast: more)')
  const systemReduce = useMediaQuery('(prefers-reduced-motion: reduce)')
  const keepOpen = (e: Event) => e.preventDefault()

  return (
    <DropdownMenu>
      <Tip label="Accessibility">
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Accessibility">
            <UniversalAccess />
          </Button>
        </DropdownMenuTrigger>
      </Tip>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Contrast</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={a.contrast} onValueChange={(contrast) => updateAppearance({ contrast: contrast as Appearance['contrast'] })}>
          <DropdownMenuRadioItem value="system" onSelect={keepOpen}>
            System <Now>{systemHigh ? 'high' : 'standard'}</Now>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="more" onSelect={keepOpen}>
            High
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="standard" onSelect={keepOpen}>
            Standard
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <Hint>High: stronger text and lines, softer textures.</Hint>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Motion</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={a.motion} onValueChange={(motion) => updateAppearance({ motion: motion as Appearance['motion'] })}>
          <DropdownMenuRadioItem value="system" onSelect={keepOpen}>
            System <Now>{systemReduce ? 'reduced' : 'full'}</Now>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="reduce" onSelect={keepOpen}>
            Reduced
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="full" onSelect={keepOpen}>
            Full
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <Hint>Reduced: no animations; things change at once.</Hint>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** What the system currently asks for, after "System" */
function Now({ children }: { children: string }) {
  return <span className="text-muted-foreground">(now {children})</span>
}

function Hint({ children }: { children: string }) {
  return <p className="px-2 pt-0.5 pb-1.5 text-xs text-muted-foreground">{children}</p>
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const list = window.matchMedia(query)
    const update = () => setMatches(list.matches)
    list.addEventListener('change', update)
    return () => list.removeEventListener('change', update)
  }, [query])
  return matches
}

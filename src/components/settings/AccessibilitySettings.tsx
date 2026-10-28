import { Contrast, Monitor, Waves } from 'lucide-react'
import { Row, SECTION_SCROLL, SectionBlock, SettingsFooter, Tiles } from '@/components/settings/controls'
import { useMediaQuery } from '@/hooks/useRootData'
import { updateAppearance, useAppearance } from '@/hooks/useAppearance'
import { cn } from '@/lib/utils'

/**
 * The Accessibility tab of Settings: contrast and motion, each following the system (the default) or set for
 * Lodoc. "System" says what the system asks for right now.
 */
export function AccessibilitySettings() {
  const a = useAppearance()
  const systemHigh = useMediaQuery('(prefers-contrast: more)')
  const systemReduce = useMediaQuery('(prefers-reduced-motion: reduce)')

  return (
    <>
      <div className={SECTION_SCROLL}>
        <SectionBlock
          icon={Contrast}
          title="Contrast"
          hint="How strongly text and lines stand out"
          onReset={a.contrast === 'system' ? undefined : () => updateAppearance({ contrast: 'system' })}
        >
          <Row label="Contrast">
            <Tiles
              label="Contrast"
              value={a.contrast}
              onChange={(contrast) => updateAppearance({ contrast })}
              options={[
                { value: 'system', name: <SystemName now={systemHigh ? 'high' : 'standard'} />, ariaLabel: 'Contrast: follow system', preview: <Monitor className="size-5" /> },
                { value: 'more', name: 'High', ariaLabel: 'High contrast', preview: <ContrastSample high /> },
                { value: 'standard', name: 'Standard', ariaLabel: 'Standard contrast', preview: <ContrastSample high={false} /> },
              ]}
            />
            <p className="text-xs text-muted-foreground">High: darker text, clearer lines and bold focus outlines. Textures get softer and the gradient goes.</p>
          </Row>
        </SectionBlock>
        <SectionBlock
          icon={Waves}
          title="Motion"
          hint="Animations, gliding and the small joys"
          onReset={a.motion === 'system' ? undefined : () => updateAppearance({ motion: 'system' })}
          last
        >
          <Row label="Motion">
            <Tiles
              label="Motion"
              value={a.motion}
              onChange={(motion) => updateAppearance({ motion })}
              options={[
                { value: 'system', name: <SystemName now={systemReduce ? 'reduced' : 'full'} />, ariaLabel: 'Motion: follow system', preview: <Monitor className="size-5" /> },
                { value: 'reduce', name: 'Reduced', ariaLabel: 'Reduced motion', preview: <MotionSample moving={false} /> },
                { value: 'full', name: 'Full', ariaLabel: 'Full motion', preview: <MotionSample moving /> },
              ]}
            />
            <p className="text-xs text-muted-foreground">Reduced: no animations; things change at once. Full keeps them even if the system asks for less.</p>
          </Row>
        </SectionBlock>
      </div>
      <SettingsFooter />
    </>
  )
}

/** "System" with what the system currently asks for */
function SystemName({ now }: { now: string }) {
  return (
    <>
      System <span className="block text-[0.6875rem] font-normal text-muted-foreground">now {now}</span>
    </>
  )
}

/** "Aa" in faint or strong ink */
function ContrastSample({ high }: { high: boolean }) {
  return <span className={cn('text-lg leading-none font-semibold', high ? 'text-foreground' : 'text-muted-foreground')}>Aa</span>
}

/** A dot with motion lines behind it, or a still dot */
function MotionSample({ moving }: { moving: boolean }) {
  return (
    <span className="flex items-center gap-0.5">
      {moving && (
        <span className="flex flex-col gap-0.5">
          <span className="h-0.5 w-2 rounded-full bg-muted-foreground/60" />
          <span className="h-0.5 w-3 rounded-full bg-muted-foreground/60" />
          <span className="h-0.5 w-2 rounded-full bg-muted-foreground/60" />
        </span>
      )}
      <span className="size-3 rounded-full bg-foreground/70" />
    </span>
  )
}

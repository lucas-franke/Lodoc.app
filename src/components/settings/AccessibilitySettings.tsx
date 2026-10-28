import { Contrast, Monitor, Waves } from 'lucide-react'
import { SectionBlock, Tiles } from '@/components/settings/controls'
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
    <div>
      <SectionBlock
        icon={Contrast}
        title="Contrast"
        onReset={a.contrast === 'system' ? undefined : () => updateAppearance({ contrast: 'system' })}
      >
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
      </SectionBlock>
      <SectionBlock
        icon={Waves}
        title="Motion"
        onReset={a.motion === 'system' ? undefined : () => updateAppearance({ motion: 'system' })}
        last
      >
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
      </SectionBlock>
    </div>
  )
}

/** "System" with what the system currently asks for */
function SystemName({ now }: { now: string }) {
  return (
    <>
      System <span className="block text-[0.6875rem] font-normal opacity-75">now {now}</span>
    </>
  )
}

/** "Aa" in faint or strong ink */
function ContrastSample({ high }: { high: boolean }) {
  return <span className={cn('text-lg leading-none font-semibold', !high && 'opacity-50')}>Aa</span>
}

/** A dot with motion lines behind it, or a still dot */
function MotionSample({ moving }: { moving: boolean }) {
  return (
    <span className="flex items-center gap-0.5">
      {moving && (
        <span className="flex flex-col gap-0.5">
          <span className="h-0.5 w-2 rounded-full bg-current opacity-50" />
          <span className="h-0.5 w-3 rounded-full bg-current opacity-50" />
          <span className="h-0.5 w-2 rounded-full bg-current opacity-50" />
        </span>
      )}
      <span className="size-3 rounded-full bg-current opacity-80" />
    </span>
  )
}

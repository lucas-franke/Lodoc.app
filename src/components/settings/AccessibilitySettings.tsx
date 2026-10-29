import { Contrast, Monitor, Waves } from 'lucide-react'
import { Choice, SectionBlock } from '@/components/settings/controls'
import { useMediaQuery } from '@/hooks/useRootData'
import { updateAppearance, useAppearance } from '@/hooks/useAppearance'
import { cn } from '@/lib/utils'

/**
 * The Accessibility tab of Settings: contrast and motion, each following the system (the default) or set for
 * Lodoc. The hint says what the system asks for right now.
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
        hint={`Your system asks for ${systemHigh ? 'high' : 'standard'} contrast right now`}
        onReset={a.contrast === 'system' ? undefined : () => updateAppearance({ contrast: 'system' })}
      >
        <Choice
          label="Contrast"
          value={a.contrast}
          onChange={(contrast) => updateAppearance({ contrast })}
          options={[
            { value: 'system', name: 'System', icon: <Monitor />, ariaLabel: 'Contrast: follow system' },
            { value: 'more', name: 'High', icon: <ContrastSample high />, ariaLabel: 'High contrast' },
            { value: 'standard', name: 'Standard', icon: <ContrastSample high={false} />, ariaLabel: 'Standard contrast' },
          ]}
        />
      </SectionBlock>
      <SectionBlock
        icon={Waves}
        title="Motion"
        hint={`Your system asks for ${systemReduce ? 'reduced' : 'full'} motion right now`}
        onReset={a.motion === 'system' ? undefined : () => updateAppearance({ motion: 'system' })}
        last
      >
        <Choice
          label="Motion"
          value={a.motion}
          onChange={(motion) => updateAppearance({ motion })}
          options={[
            { value: 'system', name: 'System', icon: <Monitor />, ariaLabel: 'Motion: follow system' },
            { value: 'reduce', name: 'Reduced', icon: <MotionSample moving={false} />, ariaLabel: 'Reduced motion' },
            { value: 'full', name: 'Full', icon: <MotionSample moving />, ariaLabel: 'Full motion' },
          ]}
        />
      </SectionBlock>
    </div>
  )
}

/** "Aa" in faint or strong ink */
function ContrastSample({ high }: { high: boolean }) {
  return <span className={cn('text-sm leading-none font-semibold', !high && 'opacity-45')}>Aa</span>
}

/** A dot with motion lines behind it, or a still dot */
function MotionSample({ moving }: { moving: boolean }) {
  return (
    <span className="flex items-center gap-0.5">
      {moving && (
        <span className="flex flex-col gap-0.5">
          <span className="h-0.5 w-1.5 rounded-full bg-current opacity-50" />
          <span className="h-0.5 w-2.5 rounded-full bg-current opacity-50" />
          <span className="h-0.5 w-1.5 rounded-full bg-current opacity-50" />
        </span>
      )}
      <span className="size-2.5 rounded-full bg-current opacity-80" />
    </span>
  )
}

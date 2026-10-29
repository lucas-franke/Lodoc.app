import { Contrast, Waves } from 'lucide-react'
import { SectionBlock, Segmented } from '@/components/settings/controls'
import { useMediaQuery } from '@/hooks/useRootData'
import { updateAppearance, useAppearance } from '@/hooks/useAppearance'

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
        <Segmented
          label="Contrast"
          value={a.contrast}
          onChange={(contrast) => updateAppearance({ contrast })}
          options={[
            { value: 'system', name: 'System', ariaLabel: 'Contrast: follow system' },
            { value: 'more', name: 'High', ariaLabel: 'High contrast' },
            { value: 'standard', name: 'Standard', ariaLabel: 'Standard contrast' },
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
        <Segmented
          label="Motion"
          value={a.motion}
          onChange={(motion) => updateAppearance({ motion })}
          options={[
            { value: 'system', name: 'System', ariaLabel: 'Motion: follow system' },
            { value: 'reduce', name: 'Reduced', ariaLabel: 'Reduced motion' },
            { value: 'full', name: 'Full', ariaLabel: 'Full motion' },
          ]}
        />
      </SectionBlock>
    </div>
  )
}

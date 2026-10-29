import { useState } from 'react'
import { useAssetUrl } from '@/hooks/useAssetUrl'
import type { ResolvedCover } from '@/lib/cover'
import { gradientById, gradientStyle } from '@/lib/gradients'
import { cn } from '@/lib/utils'

/** A note's cover (image or gradient), cropped to fill its box. Decorative, so it has no alt text. */
export function NoteCover({ cover, className }: { cover: ResolvedCover; className?: string }) {
  return cover.kind === 'image' ? (
    <ImageCover assetId={cover.assetId} className={className} />
  ) : (
    <GradientCover id={cover.id} className={className} />
  )
}

/** A gradient cover; a new gradient fades in over the old one (.joy-fade-out in index.css) */
function GradientCover({ id, className }: { id: string; className?: string }) {
  const [shown, setShown] = useState(id)
  const [previous, setPrevious] = useState<string | null>(null)
  // Derived during render (the documented way): remember what was there when the gradient changes
  if (id !== shown) {
    setPrevious(shown)
    setShown(id)
  }
  return (
    <div
      data-testid="cover-gradient"
      className={cn('cover-gradient relative overflow-hidden', className)}
      style={gradientStyle(gradientById(shown))}
    >
      {previous && (
        <div
          key={previous + shown}
          aria-hidden
          className="cover-gradient joy-fade-out absolute inset-0"
          style={gradientStyle(gradientById(previous))}
          onAnimationEnd={() => setPrevious(null)}
        />
      )}
    </div>
  )
}

function ImageCover({ assetId, className }: { assetId: string; className?: string }) {
  const url = useAssetUrl(assetId)
  return (
    <div className={cn('overflow-hidden bg-muted', className)}>
      {url && <img src={url} alt="" loading="lazy" draggable={false} className="size-full object-cover" />}
    </div>
  )
}

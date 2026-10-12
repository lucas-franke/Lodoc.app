"use client"

import * as React from "react"
import { cn } from "cn"
import { Slider as SliderPrimitive } from "radix-ui"

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  thumbLabel,
  thumbValueText,
  marker,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root> & {
  /** Accessible name of the handle(s): the role=slider element is the thumb, not the root */
  thumbLabel?: string
  /** Readable value for screen readers, e.g. "50 %" */
  thumbValueText?: string
  /** A value to mark with a small dot on the track (e.g. the default) */
  marker?: number
}) {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max]
  )
  const markerPct = marker === undefined ? null : ((marker - min) / (max - min)) * 100

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "group/slider relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="relative grow overflow-hidden rounded-full bg-muted data-horizontal:h-1 data-horizontal:w-full data-vertical:h-full data-vertical:w-1"
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className="absolute bg-primary select-none data-horizontal:h-full data-vertical:w-full"
        />
      </SliderPrimitive.Track>
      {markerPct !== null && (
        // Radix keeps the thumb inside the track, so its centre runs from half a thumb in to half a thumb
        // before the end; the dot follows the same scale (--slider-thumb is the thumb size)
        <span
          aria-hidden
          data-slot="slider-marker"
          className="pointer-events-none absolute top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted-foreground"
          style={{
            left: `calc(var(--slider-thumb, 0.75rem) / 2 + (100% - var(--slider-thumb, 0.75rem)) * ${markerPct / 100})`,
          }}
        />
      )}
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          aria-label={thumbLabel}
          aria-valuetext={thumbValueText}
          className="relative block size-3 shrink-0 rounded-full border border-ring bg-white ring-ring/50 transition-[color,box-shadow] select-none after:absolute after:-inset-2 hover:ring-3 focus-visible:ring-3 focus-visible:outline-hidden active:ring-3 disabled:pointer-events-none disabled:opacity-50"
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }

import type { SVGProps } from 'react'

/**
 * A filled "!" in a circle (Lucide's CircleAlert has only an outline, too faint at 14px). The circle takes the
 * text color; the mark takes `markClassName`'s color, the background it sits on, so it reads as cut out.
 */
export function AlertFilled({ markClassName, ...props }: SVGProps<SVGSVGElement> & { markClassName?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" aria-hidden {...props}>
      <circle cx="12" cy="12" r="11" fill="currentColor" />
      <g className={markClassName}>
        <path d="M12 6.5v6.5" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" />
        <circle cx="12" cy="17.25" r="1.6" fill="currentColor" />
      </g>
    </svg>
  )
}

import type { SVGProps } from 'react'

/** The universal access figure in a circle, drawn like a Lucide icon (Lucide only has the wheelchair figure) */
export function UniversalAccess(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="7" r="1" />
      <path d="m7 10 5 1 5-1" />
      <path d="M12 11v3.5" />
      <path d="m9.5 18 2.5-3.5 2.5 3.5" />
    </svg>
  )
}

import type { SVGProps } from "react"
/** Trazado del filtro usado por el spike. */
export function SpikeFilterIcon({ size = 18, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M3 5h18l-7 8v6l-4-2v-4Z" />
    </svg>
  )
}

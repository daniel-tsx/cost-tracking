import { cn } from '@/lib/utils'

/**
 * CostTracker brand mark — a "margin gauge": a confident gauge arc (the C of
 * Cost) that climbs from a baseline to a floating reading-head node (the latest
 * margin reading), echoing the dashboard's bespoke margin-health gauge and the
 * sparkline's current-value dot. Single-stroke + node so it themes via
 * `currentColor` and stays legible from 16px favicons to hero scale.
 *
 * Geometry is shared verbatim with the standalone assets in `public/brand/` and
 * the icon pipeline in `scripts/generate-brand-assets.mjs` — keep them in sync.
 */
const ARC_D = 'M 22.42 23.13 A 9.6 9.6 0 1 1 21.7 9.9'

/** Static mark. Defaults to the brand violet (`--primary`); override the color
 *  with a `text-*` class (e.g. `text-white` on a tinted chip). */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn('text-primary', className)}
      role="img"
      aria-label="CostTracker logo"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d={ARC_D}
        fill="none"
        stroke="currentColor"
        strokeWidth={3.8}
        strokeLinecap="round"
        pathLength={100}
      />
      <circle cx={23.6} cy={7.7} r={2.9} fill="currentColor" />
    </svg>
  )
}

/**
 * Animated mark — on mount the gauge "takes a reading": the arc draws on from
 * the baseline (stroke-dashoffset) and the reading-head node pops in as the
 * sweep arrives, then rests. One path + one circle, transform/opacity/dashoffset
 * only — no filters, no JS. Honors `prefers-reduced-motion` (renders at rest)
 * and is fully visible without CSS, so it never hides content.
 */
export function AnimatedLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn('text-primary', className)}
      role="img"
      aria-label="CostTracker logo"
      xmlns="http://www.w3.org/2000/svg"
    >
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .ct-arc { animation: ct-draw 0.9s cubic-bezier(0.4, 0, 0.2, 1) both; }
          .ct-node { animation: ct-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.55s both; }
        }
        @keyframes ct-draw { from { stroke-dashoffset: 100; } to { stroke-dashoffset: 0; } }
        @keyframes ct-pop { from { opacity: 0; transform: scale(0.4); } to { opacity: 1; transform: scale(1); } }
        .ct-node { transform-box: fill-box; transform-origin: center; }
      `}</style>
      <path
        className="ct-arc"
        d={ARC_D}
        fill="none"
        stroke="currentColor"
        strokeWidth={3.8}
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray={100}
      />
      <circle className="ct-node" cx={23.6} cy={7.7} r={2.9} fill="currentColor" />
    </svg>
  )
}

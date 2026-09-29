import type { Transition } from "motion/react"

// Apple's WWDC "Designing Fluid Interfaces" damping/response table, translated
// into Motion's duration/bounce spring syntax (bounce: 0 = critically damped).
export const springs = {
  /** damping 1.0, response 0.4 — reposition/layout, card lift, dot fill */
  move: { type: "spring", duration: 0.4, bounce: 0 } satisfies Transition,
  /** damping 0.8, response 0.4 — rotation/tilt, momentum-driven gestures */
  rotate: { type: "spring", duration: 0.4, bounce: 0.2 } satisfies Transition,
  /** damping 0.8, response 0.3 — drawers, sheets, dismiss-by-flick */
  sheet: { type: "spring", duration: 0.3, bounce: 0.2 } satisfies Transition,
  /** damping 1.0, response 0.25 — popovers, menus, micro UI */
  snappy: { type: "spring", duration: 0.25, bounce: 0 } satisfies Transition,
} as const

/** Reduced-motion fallback: linear crossfade, no overshoot, no transform. */
export const reducedTransition: Transition = { duration: 0.15, ease: "linear" }

/** Rubber-band elasticity for drag past its natural bounds (0 = rigid, 1 = no resistance). */
export const RUBBER_BAND_ELASTIC = 0.15

/** Release speed (px/s) past which a drag counts as a dismiss/flick, not a snap-back. */
export const DISMISS_VELOCITY_THRESHOLD = 500

/** Release distance (px) past which a drag counts as a dismiss, even at low velocity. */
export const DISMISS_OFFSET_THRESHOLD = 120

/** Soft resistance past a boundary — the further past `radius`, the less further px of drag translates to further px of movement. */
export function rubberband(overshoot: number, radius: number, elastic = RUBBER_BAND_ELASTIC) {
  return (overshoot * radius * elastic) / (radius + elastic * Math.abs(overshoot))
}

// Apple's fluid-interfaces projection: where a flick "wants" to end up, given
// its release velocity and natural deceleration — not just how far it moved.
export function project(velocity: number, decelerationRate = 0.998) {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate)
}

/**
 * Moment-of-delight helpers. Use them sparingly, for outcomes that matter to
 * the visitor (a quote sent, a visit booked, a checklist finished), never for
 * routine clicks. Dependency-free (Web Animations API), honours
 * prefers-reduced-motion, and silently no-ops where unsupported.
 */

/** Brand particles. CSS variables resolve on the body-level layer. */
const CONFETTI_COLORS = [
  "var(--color-brand-500)",
  "var(--color-brand-300)",
  "var(--color-gold-400)",
  "var(--color-gold-200)",
  "white",
]

type Origin = { x: number; y: number } | HTMLElement | null | undefined

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
}

/** Short vibration on supporting devices (Android Chrome). Never on reduced motion. */
export function haptic(kind: "tap" | "success" = "tap") {
  if (
    typeof navigator === "undefined" ||
    typeof navigator.vibrate !== "function" ||
    prefersReducedMotion()
  ) {
    return
  }
  // Browsers ignore (and log) vibrate() until the user has tapped the page, e.g. on
  // a thank-you page reached by full navigation. userActivation is absent on old
  // browsers; there we simply try.
  const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } })
    .userActivation
  if (activation && !activation.hasBeenActive) return
  navigator.vibrate(kind === "success" ? [12, 40, 18] : 8)
}

function resolveOrigin(origin: Origin): { x: number; y: number } {
  if (origin instanceof HTMLElement) {
    const r = origin.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }
  if (origin) return origin
  return { x: window.innerWidth / 2, y: window.innerHeight * 0.38 }
}

type CelebrateOptions = {
  /** Where the burst starts: an element, viewport coordinates, or the upper centre. */
  origin?: Origin
  /** Particle count; keep it modest on phones. */
  count?: number
  /** Half-angle of the fan in degrees. */
  spread?: number
}

/** A confetti burst: particles rise, then fall under gravity and fade. */
export function celebrate({ origin, count, spread = 68 }: CelebrateOptions = {}) {
  if (typeof document === "undefined" || prefersReducedMotion()) return

  const { x, y } = resolveOrigin(origin)
  const total = count ?? (window.innerWidth < 640 ? 44 : 64)

  const layer = document.createElement("div")
  layer.setAttribute("aria-hidden", "true")
  Object.assign(layer.style, {
    position: "fixed",
    inset: "0",
    overflow: "hidden",
    pointerEvents: "none",
    zIndex: "2147483000",
  })
  document.body.appendChild(layer)

  const running: Animation[] = []
  for (let i = 0; i < total; i++) {
    const bit = document.createElement("span")
    const size = 6 + Math.random() * 7
    Object.assign(bit.style, {
      position: "absolute",
      left: `${x}px`,
      top: `${y}px`,
      width: `${size}px`,
      height: `${size * (Math.random() > 0.5 ? 1 : 0.45)}px`,
      background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      borderRadius: Math.random() > 0.6 ? "50%" : "2px",
    })
    layer.appendChild(bit)

    const angle = ((-90 + (Math.random() - 0.5) * spread * 2) * Math.PI) / 180
    const speed = 280 + Math.random() * 380
    const dx = Math.cos(angle) * speed
    const rise = Math.sin(angle) * speed // negative: up
    const fall = 420 + Math.random() * 280
    const spin = (Math.random() - 0.5) * 900

    running.push(
      bit.animate(
        [
          { transform: "translate(0, 0) rotate(0deg)", opacity: 1, easing: "cubic-bezier(0.15, 0.7, 0.3, 1)" },
          { transform: `translate(${dx * 0.62}px, ${rise * 0.62}px) rotate(${spin * 0.5}deg)`, opacity: 1, offset: 0.38, easing: "cubic-bezier(0.5, 0, 0.9, 0.6)" },
          { transform: `translate(${dx}px, ${rise + fall}px) rotate(${spin}deg)`, opacity: 0 },
        ],
        { duration: 1100 + Math.random() * 700, fill: "forwards" },
      ),
    )
  }

  Promise.allSettled(running.map((a) => a.finished)).then(() => layer.remove())
  haptic("success")
}

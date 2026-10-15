"use client"

import { animate } from "motion/react"
import { useEffect, useRef } from "react"
import { prefersReducedMotion } from "@/lib/celebrate"

type AnimatedNumberProps = {
  value: number
  /** Formats the running number. */
  format: (n: number) => string
  className?: string
}

/**
 * Tweens to `value` whenever it changes (calculator results). The first render
 * shows the real number with no animation; later changes write straight to the
 * DOM each frame, so React never re-renders for the tween. Reduced motion jumps.
 */
export function AnimatedNumber({ value, format, className }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const shown = useRef(value)
  const fmt = useRef(format)

  useEffect(() => {
    fmt.current = format
  })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const from = shown.current
    if (from === value) return
    if (prefersReducedMotion() || !Number.isFinite(from) || !Number.isFinite(value)) {
      shown.current = value
      el.textContent = fmt.current(value)
      return
    }
    const controls = animate(from, value, {
      duration: 0.45,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (n) => {
        shown.current = n
        el.textContent = fmt.current(n)
      },
      onComplete: () => {
        shown.current = value
        el.textContent = fmt.current(value)
      },
    })
    return () => controls.stop()
  }, [value])

  return (
    <>
      <span ref={ref} aria-hidden="true" className={className}>
        {format(value)}
      </span>
      <span className="sr-only">{format(value)}</span>
    </>
  )
}

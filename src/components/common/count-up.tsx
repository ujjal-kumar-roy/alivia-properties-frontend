"use client"

import { animate, useInView } from "motion/react"
import { useLayoutEffect, useRef } from "react"
import { prefersReducedMotion } from "@/lib/celebrate"

type CountUpProps = {
  value: number
  /** Seconds. */
  duration?: number
  /** Formats the running number; defaults to en-BD grouping. */
  format?: (n: number) => string
  className?: string
}

const defaultFormat = (n: number) => Math.round(n).toLocaleString("en-BD")

/**
 * Counts up to `value` the first time it scrolls into view. The server markup
 * carries the real number (crawlers, no-JS, reduced motion all see it); the
 * count is a progressive enhancement. Writes straight to the DOM, so the
 * running number never re-renders React.
 */
export function CountUp({ value, duration = 1.4, format = defaultFormat, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const armed = useRef(false)

  // Before first paint: if we will animate, start from zero so the final
  // number never flashes. Reduced motion keeps the real value.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || prefersReducedMotion()) return
    armed.current = true
    el.textContent = format(0)
  }, [format])

  useLayoutEffect(() => {
    const el = ref.current
    if (!inView || !el || !armed.current) return
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (n) => {
        el.textContent = format(n)
      },
      onComplete: () => {
        el.textContent = format(value)
      },
    })
    return () => controls.stop()
  }, [inView, value, duration, format])

  return (
    <>
      <span ref={ref} aria-hidden="true" className={className}>
        {format(value)}
      </span>
      <span className="sr-only">{format(value)}</span>
    </>
  )
}

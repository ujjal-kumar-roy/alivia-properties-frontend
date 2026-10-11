"use client"

import { animate, useInView } from "motion/react"
import { Flame } from "lucide-react"
import { useLayoutEffect, useRef } from "react"
import { CountUp } from "@/components/common/count-up"
import { prefersReducedMotion } from "@/lib/celebrate"
import { cn } from "@/lib/utils"

type AvailabilityMeterProps = {
  /** Units still available. */
  left: number
  /** Units in the whole project. */
  total: number
  className?: string
}

/**
 * "9 of 29 units available" with a thin gold bar showing how much of the
 * project is already taken. Both numbers come from the API. The first time it
 * scrolls into view the count runs up and the bar fills (transform only); the
 * server markup already carries the final state, so crawlers, no-JS and reduced
 * motion see the real values. Low stock (a quarter or less left) turns red, the
 * same threshold the apartment cards use.
 */
export function AvailabilityMeter({ left, total, className }: AvailabilityMeterProps) {
  const takenRatio = total > 0 ? (total - left) / total : 0
  const soldOut = left <= 0
  const low = !soldOut && left / total <= 0.25

  const trackRef = useRef<HTMLDivElement>(null)
  const fillRef = useRef<HTMLDivElement>(null)
  const armed = useRef(false)
  const inView = useInView(trackRef, { once: true, margin: "0px 0px -8% 0px" })

  // Before first paint: when the fill will animate, start it empty so the
  // finished bar never flashes. Reduced motion keeps the real value.
  useLayoutEffect(() => {
    const fill = fillRef.current
    if (!fill || prefersReducedMotion()) return
    armed.current = true
    fill.style.transform = "scaleX(0)"
  }, [])

  useLayoutEffect(() => {
    const fill = fillRef.current
    if (!inView || !fill || !armed.current) return
    const controls = animate(0, takenRatio, {
      duration: 0.9,
      delay: 0.1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (value) => {
        fill.style.transform = `scaleX(${value})`
      },
      onComplete: () => {
        fill.style.transform = `scaleX(${takenRatio})`
      },
    })
    return () => controls.stop()
  }, [inView, takenRatio])

  return (
    <div className={className}>
      <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-700">
        {low ? <Flame aria-hidden="true" className="size-3.5 shrink-0 text-red-600" /> : null}
        {soldOut ? (
          <span>Sold out</span>
        ) : (
          <span>
            <CountUp
              value={left}
              className={cn("text-sm font-extrabold tabular-nums", low ? "text-red-600" : "text-amber-700")}
            />{" "}
            of {total.toLocaleString("en-BD")} units available
          </span>
        )}
      </p>
      <div ref={trackRef} aria-hidden="true" className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-100">
        <div
          ref={fillRef}
          className="h-full w-full origin-left rounded-full bg-gold-400"
          style={{ transform: `scaleX(${takenRatio})` }}
        />
      </div>
    </div>
  )
}

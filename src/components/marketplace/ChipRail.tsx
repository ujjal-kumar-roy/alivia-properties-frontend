"use client"

import { useEffect, useRef, type ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * One horizontally scrollable row of chips (never wraps). On mount it centres
 * the chip marked aria-current, so a long list opens on the visitor's place
 * instead of the far left. Pass the chips as children (links work).
 */
export function ChipRail({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const rail = ref.current
    const current = rail?.querySelector<HTMLElement>('[aria-current="page"]')
    if (!rail || !current) return
    const target = current.offsetLeft - (rail.clientWidth - current.offsetWidth) / 2
    rail.scrollLeft = Math.max(0, target)
  }, [])

  return (
    <div
      ref={ref}
      role="group"
      aria-label={label}
      className={cn(
        "relative -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:px-0",
        className,
      )}
    >
      {children}
    </div>
  )
}

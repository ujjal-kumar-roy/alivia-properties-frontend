"use client"

import { useLayoutEffect, useRef, type ReactNode } from "react"

import { cn } from "@/lib/utils"


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

  useLayoutEffect(() => {
    const rail = ref.current
    const current = rail?.querySelector<HTMLElement>('[aria-current="page"]')
    if (!rail || !current) return
    const railBox = rail.getBoundingClientRect()
    const chipBox = current.getBoundingClientRect()
    const offset = chipBox.left + chipBox.width / 2 - (railBox.left + rail.clientWidth / 2)
    rail.scrollTo({ left: rail.scrollLeft + offset, behavior: "instant" })
  }, [])

  return (
    <div
      ref={ref}
      role="group"
      aria-label={label}
      className={cn(
        // Shadow room: 8px above, 14px below (the selected chip's shadow drops 6px
        // and blurs 16px), 16px / 12px at the sides; the margins cancel it.
        "relative -mx-4 -mb-2.5 -mt-2 flex gap-1.5 overflow-x-auto px-4 pb-3.5 pt-2 scroll-px-4 scrollbar-none sm:-mx-3 sm:px-3 sm:scroll-px-3",
        // First-paint centring (the effect above does the same where unsupported).
        "*:aria-[aria-current=page]:snap-center *:aria-[aria-current=page]:[scroll-initial-target:nearest]",
        className,
      )}
    >
      {children}
    </div>
  )
}

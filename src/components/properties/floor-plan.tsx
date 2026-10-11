"use client"

import Image from "next/image"
import { useState } from "react"

export type FloorLevel = {
  label: string
  imageUrl: string
  sizeSqft?: number
}

export function FloorPlan({
  levels,
  embedded = false,
}: {
  levels: FloorLevel[]
  /** Inside an accordion: a flat bordered block instead of a glass card. */
  embedded?: boolean
}) {
  const [active, setActive] = useState(0)
  if (!levels.length) return null

  const current = levels[active]

  return (
    <div className={embedded ? "overflow-hidden rounded-2xl border border-border/60" : "surface-card overflow-hidden"}>
      <div className="flex items-center justify-between border-b border-border/60 p-3">
        <div className="flex gap-1.5">
          {levels.map((lvl, i) => (
            <button
              key={lvl.label}
              type="button"
              onClick={() => setActive(i)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                active === i
                  ? "bg-brand-700 text-white"
                  : "bg-ink-50 text-ink-700 hover:bg-ink-100"
              }`}
            >
              {lvl.label}
            </button>
          ))}
        </div>
        {current.sizeSqft ? (
          <span className="text-xs text-ink-500">{current.sizeSqft} sqft</span>
        ) : null}
      </div>
      <div className="relative h-56 sm:h-64">
        {current.imageUrl ? (
          <Image
            src={current.imageUrl}
            alt={`${current.label} floor plan`}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-ink-50 text-sm text-ink-500">
            No floor plan available
          </div>
        )}
      </div>
    </div>
  )
}

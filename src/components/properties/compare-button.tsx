"use client"

import { GitCompare } from "lucide-react"
import { useCompareProperties } from "@/hooks/use-compare-properties"
import { haptic } from "@/lib/celebrate"
import { cn } from "@/lib/utils"
import type { Property } from "@/types/property.types"

interface CompareButtonProps {
  property: Property
  className?: string
  /** "glass" is the 36px translucent icon button used on photos. */
  variant?: "plain" | "glass"
}

export function CompareButton({ property, className, variant = "plain" }: CompareButtonProps) {
  const { toggle, isAdded, isFull } = useCompareProperties()
  const added = isAdded(property.id)
  const disabled = isFull && !added

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        haptic("tap")
        // The snapshot lets /compare show the listing without an authenticated lookup.
        toggle(property.id, property)
      }}
      disabled={disabled}
      aria-pressed={added}
      aria-label="Compare property"
      title={disabled ? "Compare list full (max 4)" : added ? "Remove from compare" : "Compare"}
      className={cn(
        variant === "glass"
          ? cn(
              "btn-glass size-9 min-h-9 min-w-9 shrink-0 !p-0",
              added ? "!border-brand-700 !bg-brand-700 text-white" : "text-ink-700",
            )
          : cn(
              "flex h-7 w-7 cursor-pointer items-center justify-center rounded-full transition-[color,background-color,scale] active:scale-90 motion-reduce:active:scale-100",
              added
                ? "bg-brand-50 text-brand-600 hover:bg-brand-100"
                : "bg-muted text-muted-foreground hover:text-brand-600",
            ),
        disabled && "cursor-not-allowed opacity-40",
        className,
      )}
    >
      <GitCompare aria-hidden="true" className={variant === "glass" ? "size-4" : "h-3.5 w-3.5"} />
    </button>
  )
}

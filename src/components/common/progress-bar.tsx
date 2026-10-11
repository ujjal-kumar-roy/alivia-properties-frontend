import type React from "react"
import { cn } from "@/lib/utils"

type ProgressBarProps = {
  /** 0 to 100. */
  value: number
  /** Accessible name, e.g. "Quote progress". */
  label: string
  tone?: "brand" | "gold"
  className?: string
}

/**
 * Thick, glossy progress track with an animated fill (see .progress-* in
 * globals.css). Always shows a nub, so 0% still reads as "started".
 */
export function ProgressBar({ value, label, tone = "brand", className }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className={cn("progress-track", className)}
    >
      <div
        className={cn("progress-fill", tone === "gold" && "progress-fill--gold")}
        style={{ "--p": `${pct}%` } as React.CSSProperties}
      />
    </div>
  )
}

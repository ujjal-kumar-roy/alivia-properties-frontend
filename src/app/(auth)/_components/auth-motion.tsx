"use client"

import type { ReactNode } from "react"
import { motion, useReducedMotion } from "motion/react"
import { Loader2 } from "lucide-react"
import { springs, reducedTransition } from "@/lib/motion"
import { cn } from "@/lib/utils"

/** Inline field error: fades and rises in instead of popping (CSS only, off under reduced motion). */
export const FIELD_MESSAGE =
  "motion-safe:animate-[slide-up_0.25s_cubic-bezier(0.16,1,0.3,1)_both]"

/** A success / confirmation block that rises in once when it mounts. */
export const ENTER_RISE =
  "motion-safe:animate-[slide-up_0.45s_cubic-bezier(0.16,1,0.3,1)_both]"

/**
 * Height + opacity reveal for a banner. Render it as a direct child of
 * <AnimatePresence> so it also animates out. Spacing goes in `className` (on the
 * inner box) so the collapsing wrapper has no margin to snap away at the end.
 */
export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className="mb-0 overflow-hidden"
      initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
      animate={reduce ? { opacity: 1 } : { height: "auto", opacity: 1 }}
      exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
      transition={reduce ? reducedTransition : springs.move}
    >
      <div className={className}>{children}</div>
    </motion.div>
  )
}

/**
 * Submit-button content that crossfades between its idle and busy label. Both
 * labels share one grid cell, so the button never changes size.
 */
export function SubmitLabel({
  busy,
  idle,
  busyLabel,
}: {
  busy: boolean
  idle: ReactNode
  busyLabel: ReactNode
}) {
  const cell =
    "col-start-1 row-start-1 inline-flex items-center justify-center gap-2 transition-[opacity,scale] duration-200 motion-reduce:transition-none"
  return (
    <span className="inline-grid">
      <span className={cn(cell, busy && "scale-95 opacity-0")} aria-hidden={busy || undefined}>
        {idle}
      </span>
      <span className={cn(cell, !busy && "scale-95 opacity-0")} aria-hidden={!busy || undefined}>
        <Loader2 aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" />
        {busyLabel}
      </span>
    </span>
  )
}

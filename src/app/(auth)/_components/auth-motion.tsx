"use client"

import type { ReactNode } from "react"
import { Loader2 } from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { useFormField } from "@/components/ui/form"
import { springs, reducedTransition } from "@/lib/motion"
import { cn } from "@/lib/utils"

/** A confirmation block that rises in once when it mounts (not for direct children of the card: the cascade owns those). */
export const ENTER_RISE =
  "motion-safe:animate-[slide-up_0.45s_cubic-bezier(0.16,1,0.3,1)_both]"

/**
 * Height + opacity reveal for a banner. Render it as a direct child of
 * <AnimatePresence> so it also animates out. Spacing goes in `className` (on the
 * inner box) so the collapsing wrapper has no margin to snap away at the end.
 */
export function Reveal({
  children,
  className,
  wrapperClassName,
}: {
  children: ReactNode
  className?: string
  wrapperClassName?: string
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={cn("mb-0 overflow-hidden", wrapperClassName)}
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
 * Drop-in for FormMessage that grows (height + opacity) instead of popping, so
 * the fields and button below glide down. Same id / text as FormMessage, so
 * FormControl's aria-describedby still resolves. Must sit in a FormItem; pass
 * `inGrid={false}` when the parent is not the default grid FormItem layout.
 */
export function FieldMessage({ inGrid = true, className }: { inGrid?: boolean; className?: string }) {
  const { error, formMessageId } = useFormField()
  const body = error ? String(error.message ?? "") : ""
  return (
    <AnimatePresence initial={false}>
      {body && (
        <Reveal
          key="field-message"
          // the grid gap (6px) appears the instant the item mounts; cancel it and let the padding animate instead
          wrapperClassName={inGrid ? "-mt-1.5" : undefined}
          className="pt-1.5"
        >
          <p
            data-slot="form-message"
            id={formMessageId}
            className={cn("text-destructive text-sm font-medium", className)}
          >
            {body}
          </p>
        </Reveal>
      )}
    </AnimatePresence>
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
        <Loader2 aria-hidden="true" className={cn("h-4 w-4", busy && "motion-safe:animate-spin")} />
        {busyLabel}
      </span>
    </span>
  )
}

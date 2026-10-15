"use client"

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { animate, motion, useMotionValue } from "motion/react"
import { X } from "lucide-react"
import { useEffect, useRef, type ReactNode } from "react"

import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"
import { haptic } from "@/lib/celebrate"
import {
  DISMISS_OFFSET_THRESHOLD,
  DISMISS_VELOCITY_THRESHOLD,
  project,
  rubberband,
  springs,
} from "@/lib/motion"
import { cn } from "@/lib/utils"

type GlassSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  /** Pinned under the scrolling content (the primary action lives here). */
  footer?: ReactNode
  className?: string
}

type DragState = {
  pointerId: number
  startY: number
  startOffset: number
  samples: { t: number; y: number }[]
}

const TOP_RUBBER_RADIUS = 120

/**
 * A bottom sheet in Liquid Glass, for tasks that should not take over the page
 * (filters, sort, quick contact). It enters and leaves along the same path (up
 * from the bottom edge), and the grabber/header drags with the finger 1:1:
 *   - tracking starts from where you grabbed it (no jump to the pointer),
 *   - pulling up past the open position resists (rubber-band),
 *   - on release a flick is projected forward, so a quick fling dismisses it
 *     even if it only travelled a few pixels, and the spring continues at the
 *     release velocity (no seam between drag and settle).
 * The scrim dims the page behind. Reduced motion keeps the sheet but drops the
 * physics. Scrolling content never fights the drag: only the header drags.
 */
export function GlassSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: GlassSheetProps) {
  const reduced = usePrefersReducedMotion()
  const y = useMotionValue(0)
  const panelRef = useRef<HTMLDivElement>(null)
  const drag = useRef<DragState | null>(null)

  // A reopened sheet always starts at rest.
  useEffect(() => {
    if (open) y.set(0)
  }, [open, y])

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (reduced || (e.pointerType === "mouse" && e.button !== 0)) return
    if (drag.current) return // a second finger must not hijack the drag in progress
    y.stop() // grab it mid-flight: interruption starts from the live value
    drag.current = {
      pointerId: e.pointerId,
      startY: e.clientY,
      startOffset: y.get(),
      samples: [{ t: e.timeStamp, y: e.clientY }],
    }
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Stale pointer: the drag still tracks through the events already queued.
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const s = drag.current
    if (!s || e.pointerId !== s.pointerId) return
    const next = s.startOffset + (e.clientY - s.startY)
    // Past the open position (negative) the sheet resists; downward is free.
    y.set(next < 0 ? -rubberband(-next, TOP_RUBBER_RADIUS, 0.3) : next)
    s.samples.push({ t: e.timeStamp, y: e.clientY })
    if (s.samples.length > 5) s.samples.shift()
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const s = drag.current
    if (!s || e.pointerId !== s.pointerId) return
    drag.current = null

    // Release velocity from the last ~100ms of movement. A window shorter than
    // one frame carries no usable timing (coalesced events), so it counts as 0.
    const last = s.samples[s.samples.length - 1]
    const from = s.samples.find((sm) => last.t - sm.t <= 100) ?? last
    const dt = last.t - from.t
    // A pause before lifting the finger (>100ms since the last move) means the flick is over.
    const stale = e.timeStamp - last.t > 100
    const velocity = !stale && dt >= 16 ? ((last.y - from.y) / dt) * 1000 : 0 // px/s, positive = down
    const projected = y.get() + project(velocity)
    const dismiss =
      projected > DISMISS_OFFSET_THRESHOLD || velocity > DISMISS_VELOCITY_THRESHOLD

    if (dismiss) {
      const distance = panelRef.current?.offsetHeight ?? window.innerHeight
      // The shared sheet spring, critically damped: an overshoot past the bottom
      // edge would only delay the close.
      animate(y, distance, { ...springs.sheet, bounce: 0, velocity }).then(() =>
        onOpenChange(false),
      )
      haptic("tap")
    } else {
      // Only a flick carried momentum, so a hint of bounce is earned here
      // (the shared momentum-gesture spring).
      animate(y, 0, { ...springs.rotate, velocity })
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop data-slot="glass-sheet-scrim" className="glass-scrim" />
        <DialogPrimitive.Popup
          data-slot="glass-sheet"
          className="glass-sheet fixed inset-x-0 bottom-0 z-[71] outline-none"
        >
          <motion.div
            ref={panelRef}
            style={{ y }}
            className={cn(
              "liquid-glass flex max-h-[88dvh] flex-col rounded-t-[1.75rem] border-t",
              className,
            )}
          >
            {/* Header = the drag handle. touch-action none so a vertical drag here
                never scrolls the page; the content below scrolls natively. */}
            <div
              className="shrink-0 cursor-grab touch-none select-none px-4 pb-1 pt-2.5 active:cursor-grabbing"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <span
                aria-hidden="true"
                className="mx-auto mb-2.5 block h-1.5 w-10 rounded-full bg-ink-300/80"
              />
              <div className="flex items-center justify-between gap-3 pb-1">
                <div className="min-w-0">
                  <DialogPrimitive.Title className="font-heading text-lg font-semibold leading-tight text-ink-900">
                    {title}
                  </DialogPrimitive.Title>
                  {description ? (
                    <DialogPrimitive.Description className="mt-0.5 text-xs text-ink-600">
                      {description}
                    </DialogPrimitive.Description>
                  ) : null}
                </div>
                <DialogPrimitive.Close
                  aria-label="Close"
                  className="btn-glass size-9 shrink-0 !min-h-9 !min-w-9 !p-0"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <X aria-hidden="true" className="size-4" />
                </DialogPrimitive.Close>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-1">
              {children}
            </div>

            {footer ? (
              <div className="shrink-0 border-t border-white/50 bg-white/40 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
                {footer}
              </div>
            ) : null}
          </motion.div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

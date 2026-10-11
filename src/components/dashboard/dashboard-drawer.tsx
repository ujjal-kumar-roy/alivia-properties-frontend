"use client"

import { useEffect, useRef } from "react"

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"
import {
  DISMISS_OFFSET_THRESHOLD,
  DISMISS_VELOCITY_THRESHOLD,
  rubberband,
} from "@/lib/motion"
import type { DashboardNavItem } from "@/config/dashboard-nav.config"

// Same feel as the public mobile nav: 1:1 tracking, rubber-band at both ends, then either a
// spring back to open or a fling off-screen at release velocity. It only commits once the drag
// reads as horizontal, so the nav list's own vertical scroll is never hijacked.
const DRAG_HYSTERESIS = 10
const OPEN_OVERSHOOT_RADIUS = 120
const CLOSE_CUSHION = 420

function resistedDx(dx: number) {
  if (dx > 0) return rubberband(dx, OPEN_OVERSHOOT_RADIUS)
  if (dx < -CLOSE_CUSHION)
    return -CLOSE_CUSHION + rubberband(dx + CLOSE_CUSHION, OPEN_OVERSHOOT_RADIUS)
  return dx
}

function currentTranslateX(el: HTMLElement): number {
  const transform = getComputedStyle(el).transform
  if (transform === "none") return 0
  const match = /matrix\(([^)]+)\)/.exec(transform)
  if (!match) return 0
  const parts = match[1].split(",").map((v) => parseFloat(v.trim()))
  return parts[4] ?? 0
}

type DragState = {
  pointerId: number
  startX: number
  startY: number
  committed: boolean
  samples: { t: number; x: number }[]
}

type DashboardDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  nav: DashboardNavItem[]
  pendingCount?: number
  roleLabel: string
}

/**
 * The dashboard navigation below lg: an off-canvas glass drawer. Swipe it left to close (same
 * gesture as the public mobile nav). From lg the persistent sidebar takes over, so the drawer
 * dismisses itself if the viewport grows past that while it is open.
 */
export function DashboardDrawer({
  open,
  onOpenChange,
  nav,
  pendingCount = 0,
  roleLabel,
}: DashboardDrawerProps) {
  const reducedMotion = usePrefersReducedMotion()
  const dragRef = useRef<HTMLDivElement>(null)
  const dragStateRef = useRef<DragState | null>(null)
  const baseOffsetRef = useRef(0)
  const activeAnimRef = useRef<Animation | null>(null)

  useEffect(() => {
    if (!open) return
    const mq = window.matchMedia("(min-width: 1024px)")
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) onOpenChange(false)
    }
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [open, onOpenChange])

  function handlePointerDown(e: React.PointerEvent) {
    if (reducedMotion || e.pointerType === "mouse") return
    dragStateRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      committed: false,
      samples: [{ t: e.timeStamp, x: e.clientX }],
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    const state = dragStateRef.current
    const el = dragRef.current
    if (!state || !el || e.pointerId !== state.pointerId) return
    const dx = e.clientX - state.startX
    const dy = e.clientY - state.startY

    if (!state.committed) {
      if (Math.abs(dx) < DRAG_HYSTERESIS && Math.abs(dy) < DRAG_HYSTERESIS) return
      if (Math.abs(dy) > Math.abs(dx)) {
        dragStateRef.current = null // vertical intent: let the list scroll
        return
      }
      state.committed = true
      activeAnimRef.current?.cancel()
      activeAnimRef.current = null
      baseOffsetRef.current = currentTranslateX(el)
      try {
        el.setPointerCapture(e.pointerId)
      } catch {
        // A stale pointer: the drag still tracks through the events already in flight.
      }
    }

    state.samples.push({ t: e.timeStamp, x: e.clientX })
    if (state.samples.length > 5) state.samples.shift()
    el.style.transform = `translateX(${baseOffsetRef.current + resistedDx(dx)}px)`
  }

  function endDrag(e: React.PointerEvent) {
    const state = dragStateRef.current
    dragStateRef.current = null
    const el = dragRef.current
    if (!state || !state.committed || !el) return

    const dx = e.clientX - state.startX
    const first = state.samples[0]
    const last = state.samples[state.samples.length - 1] ?? first
    const dt = Math.max(1, last.t - first.t)
    const velocity = ((last.x - first.x) / dt) * 1000 // px/s, negative = leftwards

    const dismiss = dx < -DISMISS_OFFSET_THRESHOLD || velocity < -DISMISS_VELOCITY_THRESHOLD
    const from = el.style.transform

    if (dismiss) {
      const anim = el.animate([{ transform: from }, { transform: "translateX(-110%)" }], {
        duration: 220,
        easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        fill: "forwards",
      })
      activeAnimRef.current = anim
      anim.finished
        .then(() => onOpenChange(false))
        .catch(() => {
          /* cancelled by a new grab: that drag owns the decision now */
        })
    } else {
      const anim = el.animate([{ transform: from }, { transform: "translateX(0)" }], {
        duration: 320,
        easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        fill: "forwards",
      })
      activeAnimRef.current = anim
      anim.finished
        .then(() => {
          activeAnimRef.current = null
          el.style.transform = ""
        })
        .catch(() => {})
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        showCloseButton={false}
        className="liquid-glass w-[86vw] max-w-80 gap-0 overflow-hidden overscroll-contain border-r p-0 lg:hidden"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{roleLabel} navigation</SheetTitle>
        </SheetHeader>
        <div
          ref={dragRef}
          className="flex h-full min-h-0 flex-col"
          style={{ touchAction: "pan-y" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <DashboardSidebar
            nav={nav}
            pendingCount={pendingCount}
            roleLabel={roleLabel}
            variant="mobile"
            onNavigate={() => onOpenChange(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}

"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import {
  ChevronLeft,
  ChevronRight,
  RotateCw,
  RotateCcw,
  Maximize2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react"

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"
import {
  DISMISS_OFFSET_THRESHOLD,
  DISMISS_VELOCITY_THRESHOLD,
  rubberband,
} from "@/lib/motion"
import { cn } from "@/lib/utils"

const DISMISS_DRAG_HYSTERESIS = 10
const DISMISS_RUBBER_RADIUS = 220

type DismissDragState = {
  pointerId: number
  startX: number
  startY: number
  committed: boolean
  samples: { t: number; y: number }[]
}

const MIN_SCALE = 1
const MAX_SCALE = 5
const STEP = 0.5

type Props = {
  images: string[]
  index: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onIndexChange: (index: number) => void
  /** Used to build per-image alt text, e.g. "Mir Ceramics photo 2". */
  label?: string
}

/**
 * Fullscreen image inspector: zoom in/out (buttons · wheel · double-click),
 * 90° rotate, drag-to-pan when zoomed, and prev/next navigation. Fully
 * keyboard-driven and respects prefers-reduced-motion. The Base UI Dialog
 * gives us the focus trap + Esc-to-close + scrim for free.
 */
export function MediaLightbox({
  images,
  index,
  open,
  onOpenChange,
  onIndexChange,
  label,
}: Props) {
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  const dragState = useRef<{
    startX: number
    startY: number
    originX: number
    originY: number
  } | null>(null)
  const [dragging, setDragging] = useState(false)

  const reducedMotion = usePrefersReducedMotion()
  const lightboxRef = useRef<HTMLDivElement>(null)
  const dismissStateRef = useRef<DismissDragState | null>(null)
  const dismissAnimRef = useRef<Animation | null>(null)

  const count = images.length
  const src = images[index] ?? null
  const isZoomed = scale > 1
  const isTransformed =
    isZoomed || rotation !== 0 || offset.x !== 0 || offset.y !== 0

  const resetView = useCallback(() => {
    setScale(1)
    setRotation(0)
    setOffset({ x: 0, y: 0 })
  }, [])

  // Reset zoom/rotation/pan whenever the slide changes or the modal re-opens.
  // Done during render (not in an effect) to avoid cascading re-renders.
  const viewKey = `${open}:${index}`
  const [prevViewKey, setPrevViewKey] = useState(viewKey)
  if (viewKey !== prevViewKey) {
    setPrevViewKey(viewKey)
    setScale(1)
    setRotation(0)
    setOffset({ x: 0, y: 0 })
  }

  const go = useCallback(
    (delta: number) => {
      if (count < 2) return
      onIndexChange((index + delta + count) % count)
    },
    [count, index, onIndexChange],
  )

  const zoomBy = useCallback((delta: number) => {
    setScale((s) => {
      const next = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, Math.round((s + delta) * 100) / 100),
      )
      if (next === MIN_SCALE) setOffset({ x: 0, y: 0 }) // recentre when fully zoomed out
      return next
    })
  }, [])

  // Keyboard controls (Esc is handled by the Dialog itself).
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault()
          go(-1)
          break
        case "ArrowRight":
          e.preventDefault()
          go(1)
          break
        case "+":
        case "=":
          e.preventDefault()
          zoomBy(STEP)
          break
        case "-":
        case "_":
          e.preventDefault()
          zoomBy(-STEP)
          break
        case "r":
        case "R":
          e.preventDefault()
          setRotation((d) => (d + 90) % 360)
          break
        case "0":
          e.preventDefault()
          resetView()
          break
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, go, zoomBy, resetView])

  function onWheel(e: React.WheelEvent) {
    e.preventDefault()
    zoomBy(e.deltaY < 0 ? STEP / 2 : -STEP / 2)
  }

  function onPointerDown(e: React.PointerEvent) {
    if (isZoomed) {
      e.currentTarget.setPointerCapture(e.pointerId)
      dragState.current = {
        startX: e.clientX,
        startY: e.clientY,
        originX: offset.x,
        originY: offset.y,
      }
      setDragging(true)
      return
    }
    // Not zoomed: track a possible vertical swipe-to-dismiss instead. Only
    // commits once the gesture reads as vertical, so a horizontal browse
    // gesture (prev/next buttons, or just a stray move) isn't hijacked.
    if (reducedMotion) return
    dismissStateRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      committed: false,
      samples: [{ t: e.timeStamp, y: e.clientY }],
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (dragState.current) {
      setOffset({
        x: dragState.current.originX + (e.clientX - dragState.current.startX),
        y: dragState.current.originY + (e.clientY - dragState.current.startY),
      })
      return
    }

    const state = dismissStateRef.current
    const el = lightboxRef.current
    if (!state || !el || e.pointerId !== state.pointerId) return
    const dx = e.clientX - state.startX
    const dy = e.clientY - state.startY

    if (!state.committed) {
      if (
        Math.abs(dx) < DISMISS_DRAG_HYSTERESIS &&
        Math.abs(dy) < DISMISS_DRAG_HYSTERESIS
      )
        return
      if (Math.abs(dx) > Math.abs(dy)) {
        dismissStateRef.current = null
        return
      }
      state.committed = true
      dismissAnimRef.current?.cancel()
      dismissAnimRef.current = null
      try {
        el.setPointerCapture(e.pointerId)
      } catch {
        // Stale pointer session — the drag still tracks via move events already in flight.
      }
    }

    state.samples.push({ t: e.timeStamp, y: e.clientY })
    if (state.samples.length > 5) state.samples.shift()
    const resisted = rubberband(dy, DISMISS_RUBBER_RADIUS)
    el.style.transform = `translateY(${resisted}px)`
    el.style.opacity = String(Math.max(0.4, 1 - Math.abs(resisted) / 400))
  }

  function endDrag(e: React.PointerEvent) {
    if (dragState.current) {
      dragState.current = null
      setDragging(false)
      if (e.currentTarget.hasPointerCapture(e.pointerId))
        e.currentTarget.releasePointerCapture(e.pointerId)
      return
    }

    const state = dismissStateRef.current
    dismissStateRef.current = null
    const el = lightboxRef.current
    if (!state || !el || !state.committed) return

    const dy = e.clientY - state.startY
    const first = state.samples[0]
    const last = state.samples[state.samples.length - 1] ?? first
    const dt = Math.max(1, last.t - first.t)
    const velocity = ((last.y - first.y) / dt) * 1000 // px/s

    const dismiss =
      Math.abs(dy) > DISMISS_OFFSET_THRESHOLD ||
      Math.abs(velocity) > DISMISS_VELOCITY_THRESHOLD

    if (dismiss) {
      const direction = dy < 0 ? -1 : 1
      const anim = el.animate(
        [
          { transform: el.style.transform, opacity: el.style.opacity || "1" },
          {
            transform: `translateY(${direction * window.innerHeight}px)`,
            opacity: "0",
          },
        ],
        {
          duration: 220,
          easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
          fill: "forwards",
        },
      )
      dismissAnimRef.current = anim
      anim.finished
        .then(() => onOpenChange(false))
        .catch(() => {
          /* cancelled by a new grab — that drag owns the close decision now */
        })
    } else {
      const anim = el.animate(
        [
          { transform: el.style.transform, opacity: el.style.opacity || "1" },
          { transform: "translateY(0)", opacity: "1" },
        ],
        {
          duration: 280,
          easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
          fill: "forwards",
        },
      )
      dismissAnimRef.current = anim
      anim.finished
        .then(() => {
          dismissAnimRef.current = null
          el.style.transform = ""
          el.style.opacity = ""
        })
        .catch(() => {})
    }
  }

  function onDoubleClick() {
    if (isZoomed) resetView()
    else setScale(2.5)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="block h-[92vh] max-h-[92vh] w-[96vw] max-w-none overflow-hidden border-0 bg-ink-950/96 p-0 ring-0 sm:max-w-none"
      >
        <DialogTitle className="sr-only">
          {label ? `${label} — image viewer` : "Image viewer"}
        </DialogTitle>

        {/* Drag target for swipe-to-dismiss (unzoomed only) — moves the whole
            lightbox UI as one unit, rubber-banded, fading as it travels. */}
        <div ref={lightboxRef} className="relative size-full">
          {/* Top control bar */}
          <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-2 bg-linear-to-b from-black/70 to-transparent px-3 py-3 sm:px-4">
            <span className="rounded-full bg-black/45 px-3 py-1 font-mono text-xs font-medium text-white/90 tabular-nums backdrop-blur-sm">
              {count > 0 ? `${index + 1} / ${count}` : "—"}
            </span>

            <div className="flex items-center gap-1.5">
              <ToolButton
                label="Zoom out"
                onClick={() => zoomBy(-STEP)}
                disabled={scale <= MIN_SCALE}
              >
                <ZoomOut className="size-5" />
              </ToolButton>
              <span className="min-w-12 select-none text-center font-mono text-xs text-white/80 tabular-nums">
                {Math.round(scale * 100)}%
              </span>
              <ToolButton
                label="Zoom in"
                onClick={() => zoomBy(STEP)}
                disabled={scale >= MAX_SCALE}
              >
                <ZoomIn className="size-5" />
              </ToolButton>
              <ToolButton
                label="Rotate left"
                onClick={() => setRotation((d) => (d - 90 + 360) % 360)}
              >
                <RotateCcw className="size-5" />
              </ToolButton>
              <ToolButton
                label="Rotate right"
                onClick={() => setRotation((d) => (d + 90) % 360)}
              >
                <RotateCw className="size-5" />
              </ToolButton>
              <ToolButton
                label="Reset view"
                onClick={resetView}
                disabled={!isTransformed}
              >
                <Maximize2 className="size-5" />
              </ToolButton>
              <ToolButton
                label="Close viewer"
                onClick={() => onOpenChange(false)}
              >
                <X className="size-5" />
              </ToolButton>
            </div>
          </div>

          {/* Stage */}
          <div
            className="relative flex size-full items-center justify-center overflow-hidden"
            onWheel={onWheel}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onDoubleClick={onDoubleClick}
            style={{
              cursor: isZoomed ? (dragging ? "grabbing" : "grab") : "default",
              touchAction: "none",
            }}
          >
            {src && (
              <div
                className="relative size-full motion-safe:transition-transform motion-safe:duration-200"
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale}) rotate(${rotation}deg)`,
                  transition: dragging ? "none" : undefined,
                }}
              >
                <Image
                  src={src}
                  alt={
                    label ? `${label} photo ${index + 1}` : `Photo ${index + 1}`
                  }
                  fill
                  unoptimized
                  priority
                  sizes="96vw"
                  className="select-none object-contain"
                  draggable={false}
                />
              </div>
            )}

            {/* Prev / next */}
            {count > 1 && (
              <>
                <ArrowButton
                  side="left"
                  label="Previous photo"
                  onClick={() => go(-1)}
                >
                  <ChevronLeft className="size-6" />
                </ArrowButton>
                <ArrowButton
                  side="right"
                  label="Next photo"
                  onClick={() => go(1)}
                >
                  <ChevronRight className="size-6" />
                </ArrowButton>
              </>
            )}
          </div>

          {/* Bottom hint */}
          <div className="absolute inset-x-0 bottom-0 z-20 flex justify-center bg-linear-to-t from-black/60 to-transparent px-4 py-3">
            <p className="text-center text-[11px] text-white/65">
              Scroll or double-click to zoom · drag to pan ·{" "}
              <kbd className="font-mono">R</kbd> to rotate ·{" "}
              <kbd className="font-mono">←/→</kbd> to browse ·{" "}
              <kbd className="font-mono">Esc</kbd> to close
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ToolButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex size-11 items-center justify-center rounded-full text-white/90 transition-colors",
        "hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
        "disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent",
      )}
    >
      {children}
    </button>
  )
}

function ArrowButton({
  side,
  label,
  onClick,
  children,
}: {
  side: "left" | "right"
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "absolute top-1/2 z-10 flex size-12 -translate-y-1/2 items-center justify-center rounded-full",
        "bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/70",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
        side === "left" ? "left-3 sm:left-5" : "right-3 sm:right-5",
      )}
    >
      {children}
    </button>
  )
}

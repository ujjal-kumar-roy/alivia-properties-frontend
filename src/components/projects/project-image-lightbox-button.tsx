"use client"

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import Image from "next/image"
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Images,
  Maximize2,
  RotateCcw,
  RotateCw,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"
import { cn } from "@/lib/utils"

type ProjectLightboxProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  images: string[]
  /** Slide shown when the viewer opens. */
  startIndex: number
  label: string
  /** Fires whenever the visitor lands on another photo (swipe, arrows, keys). */
  onIndexChange?: (index: number) => void
}

// Edge padding that clears the notch, home indicator and rounded corners.
const SAFE_TOP = "pt-[max(0.75rem,env(safe-area-inset-top))]"
const SAFE_BOTTOM = "pb-[max(0.75rem,env(safe-area-inset-bottom))]"
const SAFE_X = "pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]"

/**
 * Full-screen photo viewer. Photos sit in a native scroll-snap strip, so a
 * swipe has real momentum and one flick moves exactly one photo. Controls are
 * clear glass over the photo: counter chip top left, a 44px close button top
 * right, zoom and rotate in a capsule at the bottom, arrows from `md`. Built on
 * the Base UI dialog, so it traps focus, closes on Escape and locks page scroll.
 */
export function ProjectLightbox({
  open,
  onOpenChange,
  images,
  startIndex,
  label,
  onIndexChange,
}: ProjectLightboxProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Popup
          data-slot="project-lightbox"
          className="fixed inset-0 z-[90] bg-ink-950 text-white outline-none transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none"
        >
          <DialogPrimitive.Title className="sr-only">{label} image viewer</DialogPrimitive.Title>
          <LightboxStage
            images={images}
            startIndex={startIndex}
            label={label}
            onIndexChange={onIndexChange}
          />
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function LightboxStage({
  images,
  startIndex,
  label,
  onIndexChange,
}: Omit<ProjectLightboxProps, "open" | "onOpenChange">) {
  const reducedMotion = usePrefersReducedMotion()
  const scrollerRef = useRef<HTMLDivElement>(null)
  // The strip opens on this slide once; later swipes must never be fought.
  const [initialIndex] = useState(startIndex)
  const [active, setActive] = useState(startIndex)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const count = images.length

  useLayoutEffect(() => {
    const strip = scrollerRef.current
    if (strip) strip.scrollLeft = strip.clientWidth * initialIndex
  }, [initialIndex])

  function handleScroll() {
    const strip = scrollerRef.current
    if (!strip || strip.clientWidth === 0) return
    const next = Math.min(count - 1, Math.max(0, Math.round(strip.scrollLeft / strip.clientWidth)))
    if (next === active) return
    setActive(next)
    setZoom(1)
    setRotation(0)
    onIndexChange?.(next)
  }

  function step(delta: number) {
    const strip = scrollerRef.current
    if (!strip || count < 2) return
    const next = (active + delta + count) % count
    strip.scrollTo({
      left: next * strip.clientWidth,
      behavior: reducedMotion || Math.abs(next - active) > 1 ? "auto" : "smooth",
    })
  }

  // Arrow keys step through photos. Escape is handled by the dialog itself.
  // Capture phase: the dialog stops key events from bubbling out of its popup.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowRight") step(1)
      if (event.key === "ArrowLeft") step(-1)
    }
    window.addEventListener("keydown", onKeyDown, true)
    return () => window.removeEventListener("keydown", onKeyDown, true)
  })

  return (
    <div className="relative h-full w-full">
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex h-full touch-pan-x touch-pinch-zoom snap-x snap-mandatory overflow-x-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((src, index) => (
          <div
            key={`${src}-${index}`}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${count}`}
            className="relative h-full w-full shrink-0 snap-center snap-always overflow-hidden"
          >
            {/* Only the neighbours of the current photo are fetched. */}
            {Math.abs(index - active) <= 1 ? (
              <Image
                src={src}
                alt={`${label} image ${index + 1}`}
                fill
                sizes="100vw"
                quality={85}
                draggable={false}
                className="object-contain transition-transform duration-200 ease-out select-none motion-reduce:transition-none"
                style={
                  index === active
                    ? { transform: `scale(${zoom}) rotate(${rotation}deg)` }
                    : undefined
                }
              />
            ) : null}
          </div>
        ))}
      </div>

      {/* Scrims keep the glass controls legible when a photo fills the screen. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-28 bg-linear-to-b from-ink-950/70 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-32 bg-linear-to-t from-ink-950/70 to-transparent"
      />

      {/* Top row: counter and close. The row ignores touches so swipes pass through. */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-3 pb-3",
          SAFE_TOP,
          SAFE_X,
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <p className="glass-clear pointer-events-auto inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold tabular-nums text-white">
            <Images aria-hidden="true" className="size-3.5" />
            {active + 1} / {count}
          </p>
          <p className="min-w-0 truncate text-sm font-semibold text-white/90">{label}</p>
        </div>
        <DialogPrimitive.Close
          aria-label="Close image viewer"
          className="glass-clear pointer-events-auto grid size-11 shrink-0 place-items-center rounded-full text-white transition-[scale] duration-150 outline-none focus-visible:ring-2 focus-visible:ring-gold-300 active:scale-95 motion-reduce:transition-none"
        >
          <X aria-hidden="true" className="size-5" />
        </DialogPrimitive.Close>
      </div>

      {count > 1 ? (
        <>
          <ArrowButton side="left" label="Previous image" onClick={() => step(-1)}>
            <ChevronLeft aria-hidden="true" className="size-5" />
          </ArrowButton>
          <ArrowButton side="right" label="Next image" onClick={() => step(1)}>
            <ChevronRight aria-hidden="true" className="size-5" />
          </ArrowButton>
        </>
      ) : null}

      {/* Bottom capsule: zoom and rotate. */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center pt-3",
          SAFE_BOTTOM,
          SAFE_X,
        )}
      >
        <div className="glass-clear pointer-events-auto flex items-center gap-0.5 rounded-full p-1">
          <ToolButton label="Zoom out" onClick={() => setZoom((value) => Math.max(0.5, value - 0.25))}>
            <ZoomOut aria-hidden="true" className="size-[1.125rem]" />
          </ToolButton>
          <button
            type="button"
            aria-label="Reset zoom and rotation"
            onClick={() => {
              setZoom(1)
              setRotation(0)
            }}
            className="h-10 min-w-14 rounded-full px-2 text-center text-xs font-semibold tabular-nums text-white outline-none focus-visible:ring-2 focus-visible:ring-gold-300 active:bg-white/15"
          >
            {Math.round(zoom * 100)}%
          </button>
          <ToolButton label="Zoom in" onClick={() => setZoom((value) => Math.min(3, value + 0.25))}>
            <ZoomIn aria-hidden="true" className="size-[1.125rem]" />
          </ToolButton>
          <ToolButton label="Rotate left" onClick={() => setRotation((value) => value - 90)}>
            <RotateCcw aria-hidden="true" className="size-[1.125rem]" />
          </ToolButton>
          <ToolButton label="Rotate right" onClick={() => setRotation((value) => value + 90)}>
            <RotateCw aria-hidden="true" className="size-[1.125rem]" />
          </ToolButton>
        </div>
      </div>
    </div>
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
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "glass-clear absolute top-1/2 z-10 hidden size-12 -translate-y-1/2 place-items-center rounded-full text-white transition-[scale] duration-150 outline-none focus-visible:ring-2 focus-visible:ring-gold-300 active:scale-95 md:grid motion-reduce:transition-none",
        side === "left" ? "left-4" : "right-4",
      )}
    >
      {children}
    </button>
  )
}

function ToolButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-10 place-items-center rounded-full text-white outline-none focus-visible:ring-2 focus-visible:ring-gold-300 active:bg-white/15"
    >
      {children}
    </button>
  )
}

type ProjectImageLightboxButtonProps = {
  images: string[]
  index: number
  label: string
  className?: string
}

/**
 * A self-contained "open the viewer" button for a photo box: a 44px clear-glass
 * icon in its top right corner that owns its own viewer. Place it inside a
 * `relative` container. (The gallery drives <ProjectLightbox> directly so a tap
 * on the photo opens it too.)
 */
export function ProjectImageLightboxButton({
  images,
  index,
  label,
  className,
}: ProjectImageLightboxButtonProps) {
  const [open, setOpen] = useState(false)
  const photos = images.filter(Boolean)
  if (photos.length === 0) return null

  return (
    <>
      <button
        type="button"
        aria-label={`Open ${label} image viewer`}
        onClick={() => setOpen(true)}
        className={cn(
          "glass-clear absolute top-3 right-3 z-10 grid size-11 place-items-center rounded-full text-white outline-none focus-visible:ring-2 focus-visible:ring-gold-300",
          className,
        )}
      >
        <Maximize2 aria-hidden="true" className="size-5" />
      </button>
      <ProjectLightbox
        open={open}
        onOpenChange={setOpen}
        images={photos}
        startIndex={Math.min(index, photos.length - 1)}
        label={label}
      />
    </>
  )
}

"use client"

import { ChevronDown } from "lucide-react"
import { useEffect, useId, useRef, useState, type MouseEvent, type ReactNode } from "react"

import { cn } from "@/lib/utils"

type ReadMoreProps = {
  children: ReactNode
  /** Height (px) of the clamped preview. */
  collapsedHeight?: number
  className?: string
}

/** Overflow smaller than this is not worth hiding behind a button. */
const SLACK_PX = 32

/**
 * Clamps long text to a preview with a "Read more" toggle. The height is set in
 * pixels and animated with a CSS transition (interruptible: a second tap
 * reverses it mid-way). Starts clamped on the server; if, once measured, the
 * text turns out to fit, it expands and the button goes away.
 */
export function ReadMore({ children, collapsedHeight = 176, className }: ReadMoreProps) {
  const panelId = useId()
  const contentRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [instant, setInstant] = useState(false)
  const [contentHeight, setContentHeight] = useState<number | null>(null)

  useEffect(() => {
    const content = contentRef.current
    if (!content) return
    const observer = new ResizeObserver(() => setContentHeight(content.offsetHeight))
    observer.observe(content)
    return () => observer.disconnect()
  }, [])

  const overflowing = contentHeight === null || contentHeight > collapsedHeight + SLACK_PX
  const height = !overflowing ? undefined : open ? (contentHeight ?? undefined) : collapsedHeight

  function toggle(event: MouseEvent) {
    // Keyboard activation (detail 0) applies instantly; pointer taps animate.
    setInstant(event.detail === 0)
    setOpen((value) => !value)
  }

  return (
    <div className={className}>
      <div className="relative">
        <div
          id={panelId}
          style={{ height }}
          className={cn(
            "overflow-hidden transition-[height] duration-220 ease-(--ease-out) motion-reduce:transition-none",
            instant && "transition-none",
          )}
        >
          <div ref={contentRef}>{children}</div>
        </div>
        {overflowing ? (
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-linear-to-t from-white to-transparent transition-opacity duration-220 ease-(--ease-out) motion-reduce:duration-150",
              open ? "opacity-0" : "opacity-100",
            )}
          />
        ) : null}
      </div>
      {overflowing ? (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={toggle}
          className="mt-1 inline-flex min-h-11 items-center gap-1 rounded-lg px-1 text-sm font-semibold text-brand-700 transition-[scale,color] duration-140 ease-(--ease-out) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 active:scale-[0.97] motion-reduce:active:scale-100 [@media(hover:hover)_and_(pointer:fine)]:hover:text-brand-900"
        >
          {open ? "Show less" : "Read more"}
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "size-4 transition-transform duration-220 ease-(--ease-out) motion-reduce:transition-none",
              open && "rotate-180",
            )}
          />
        </button>
      ) : null}
    </div>
  )
}

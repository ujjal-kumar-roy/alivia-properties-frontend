"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import { useEffect, useId, useRef, useState, type MouseEvent, type ReactNode } from "react"

import { cn } from "@/lib/utils"

type RailScrollerProps = {
  title: string
  /** "See all" destination; the link is omitted without it. */
  href?: string
  /** `<li>` items, each already sized (fixed width, `shrink-0 snap-start`). */
  children: ReactNode
  className?: string
}

const EDGE_SLACK_PX = 4

const navButton =
  "relative hidden size-10 items-center justify-center rounded-full border border-ink-200 bg-white text-ink-700 transition-[scale,background-color,border-color,opacity] duration-140 ease-(--ease-out) after:absolute after:-inset-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-colors motion-reduce:active:scale-100 md:inline-flex [@media(hover:hover)_and_(pointer:fine)]:hover:border-ink-300 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-ink-50"

/**
 * Horizontal scroll-snap row with a title, an optional "See all" link, and
 * (md+) prev/next buttons that page by one visible width. White fades hint at
 * more content on whichever side has it. The cards are passed in as children so
 * `ProductRail` can keep rendering them on the server.
 */
export function RailScroller({ title, href, children, className }: RailScrollerProps) {
  const headingId = useId()
  const scrollerRef = useRef<HTMLDivElement>(null)
  // Assume the row overflows to the right until measured: most rails do, and
  // the buttons/fade then don't pop in after hydration.
  const [edges, setEdges] = useState({ start: false, end: true })

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    let frame = 0
    const measure = () => {
      frame = 0
      const max = scroller.scrollWidth - scroller.clientWidth
      const start = scroller.scrollLeft > EDGE_SLACK_PX
      const end = scroller.scrollLeft < max - EDGE_SLACK_PX
      setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }))
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }

    scroller.addEventListener("scroll", schedule, { passive: true })
    // Fires once on observe (initial measure) and again on any size change.
    // The list is w-max, so it also grows when cards are added to the row.
    const observer = new ResizeObserver(schedule)
    observer.observe(scroller)
    if (scroller.firstElementChild) observer.observe(scroller.firstElementChild)

    return () => {
      scroller.removeEventListener("scroll", schedule)
      observer.disconnect()
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  function page(direction: 1 | -1, event: MouseEvent) {
    const scroller = scrollerRef.current
    if (!scroller) return
    // Smooth for pointer clicks; instant for keyboard activation (detail 0) and reduced motion.
    const instant = event.detail === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches
    scroller.scrollBy({ left: direction * scroller.clientWidth, behavior: instant ? "auto" : "smooth" })
  }

  const scrollable = edges.start || edges.end

  return (
    <section aria-labelledby={headingId} className={cn("min-w-0", className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 id={headingId} className="text-lg font-extrabold text-ink-900 md:text-xl">
          {title}
        </h2>
        <div className="flex items-center gap-1">
          {href ? (
            <Link
              href={href}
              className="inline-flex min-h-11 items-center gap-0.5 rounded-lg px-1 text-sm font-semibold text-brand-700 transition-[scale,color] duration-140 ease-(--ease-out) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 active:scale-[0.97] motion-reduce:active:scale-100 [@media(hover:hover)_and_(pointer:fine)]:hover:text-brand-900"
            >
              See all
              <ChevronRight aria-hidden="true" className="size-4" />
            </Link>
          ) : null}
          {scrollable ? (
            <>
              <button
                type="button"
                aria-label={`Previous in ${title}`}
                disabled={!edges.start}
                onClick={(event) => page(-1, event)}
                className={navButton}
              >
                <ChevronLeft aria-hidden="true" className="size-5" />
              </button>
              <button
                type="button"
                aria-label={`Next in ${title}`}
                disabled={!edges.end}
                onClick={(event) => page(1, event)}
                className={navButton}
              >
                <ChevronRight aria-hidden="true" className="size-5" />
              </button>
            </>
          ) : null}
        </div>
      </div>

      {/* Phones bleed to the screen edge (the page gutter is px-4); from sm the row stops at the container. */}
      <div className="relative -mx-4 mt-1 sm:mx-0">
        <div
          ref={scrollerRef}
          className="-my-3 snap-x snap-mandatory scroll-pl-4 overflow-x-auto overscroll-x-contain px-4 py-3 scrollbar-none sm:scroll-pl-0 sm:px-0"
        >
          {/* role="list": Safari drops list semantics once Tailwind removes the bullets. */}
          <ul role="list" className="flex w-max gap-3">
            {children}
          </ul>
        </div>
        <EdgeFade side="start" visible={edges.start} />
        <EdgeFade side="end" visible={edges.end} />
      </div>
    </section>
  )
}

function EdgeFade({ side, visible }: { side: "start" | "end"; visible: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-y-0 w-8 transition-opacity duration-150 ease-(--ease-out) md:w-12",
        side === "start" ? "left-0 bg-linear-to-r from-white to-transparent" : "right-0 bg-linear-to-l from-white to-transparent",
        visible ? "opacity-100" : "opacity-0",
      )}
    />
  )
}

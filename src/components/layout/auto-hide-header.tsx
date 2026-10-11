"use client"

import { useMotionValueEvent, useScroll } from "motion/react"
import { useEffect, useRef, type ComponentPropsWithoutRef, type ElementType } from "react"
import { cn } from "@/lib/utils"

/** Downward travel (px) that sends the bar away; upward travel (px) that brings it back. */
const HIDE_AFTER = 12
const SHOW_AFTER = 6
/** Beyond this scroll depth the bar counts as "scrolled" (drives its shadow). */
const SCROLLED_AT = 8

type AutoHideHeaderProps = ComponentPropsWithoutRef<"header"> & {
  /** The landmark on site pages; a plain section/div where the page already owns the banner. */
  as?: "header" | "section" | "div"
  /** The bar never hides while the page is scrolled less than this many px. */
  threshold?: number
  /** Which edge it leaves through. Floating controls anchored to the bottom use "bottom". */
  edge?: "top" | "bottom"
  /** Pin it open (e.g. while a chat panel is expanded). */
  disabled?: boolean
}

/**
 * Sticky bar that leaves on scroll-down and comes back on scroll-up, so a phone
 * keeps its whole viewport for content and the bar is one flick away.
 *
 * Scroll direction comes from Motion's `useScroll` (no raw scroll listener) and
 * is written straight to `data-hidden` / `data-scrolled`, so scrolling never
 * re-renders React. The slide itself is the `.autohide` rule in globals.css:
 * transform only, so it stays on the compositor. The bar stays put while focus
 * is inside it or one of its menus is open (`aria-expanded`), and `children`
 * can read the state with `group-data-[scrolled=true]/header:*`.
 *
 * Callers own positioning: pass `sticky top-0 z-*` in `className`. Floating
 * bottom-edge controls (the chat button) use `edge="bottom"`.
 */
export function AutoHideHeader({
  as: Tag = "header",
  threshold = 72,
  edge = "top",
  disabled = false,
  className,
  ...props
}: AutoHideHeaderProps) {
  // Only `dataset` is used, so the concrete element type does not matter; HTMLDivElement
  // keeps the polymorphic `Component` ref assignable.
  const ref = useRef<HTMLDivElement>(null)
  const track = useRef({
    last: 0,
    /** Scroll offset where the current direction of travel began. */
    anchor: 0,
    dir: 1 as 1 | -1,
    hidden: false,
    scrolled: false,
  })
  const { scrollY } = useScroll()

  // A restored scroll offset (reload, back navigation) is not a scroll: start from it.
  useEffect(() => {
    track.current.last = window.scrollY
    track.current.anchor = window.scrollY
  }, [])

  // Pinned open: clear any hidden state and ignore scroll until re-enabled.
  useEffect(() => {
    const el = ref.current
    if (!disabled || !el) return
    track.current.hidden = false
    el.dataset.hidden = "false"
  }, [disabled])

  useMotionValueEvent(scrollY, "change", (y) => {
    const el = ref.current
    if (!el || disabled) return
    const s = track.current
    const max = document.documentElement.scrollHeight - window.innerHeight
    // iOS rubber-banding reports offsets outside the real range: ignore it.
    if (y < 0 || y > max + 1) return

    const dir = y > s.last ? 1 : y < s.last ? -1 : s.dir
    if (dir !== s.dir) {
      s.dir = dir
      s.anchor = s.last
    }
    s.last = y

    const scrolled = y > SCROLLED_AT
    if (scrolled !== s.scrolled) {
      s.scrolled = scrolled
      el.dataset.scrolled = String(scrolled)
    }

    let hidden = s.hidden
    if (y <= threshold || max <= threshold * 2) hidden = false
    else if (dir === 1 && y - s.anchor > HIDE_AFTER) hidden = true
    else if (dir === -1 && s.anchor - y > SHOW_AFTER) hidden = false

    if (hidden !== s.hidden) {
      s.hidden = hidden
      el.dataset.hidden = String(hidden)
    }
  })

  const Component: ElementType = Tag
  return (
    <Component
      ref={ref}
      data-hidden="false"
      data-scrolled="false"
      data-edge={edge}
      className={cn("autohide group/header", className)}
      {...props}
    />
  )
}

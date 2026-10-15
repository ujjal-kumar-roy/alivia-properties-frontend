"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState, type RefObject } from "react"
import { Check, Plus } from "lucide-react"

import { ROUTES } from "@/config/routes.config"
import { useQuoteList } from "@/hooks/use-quote-list"
import { haptic, prefersReducedMotion } from "@/lib/celebrate"
import { QUOTE_LIST_BUMP_EVENT, type QuoteListItem } from "@/lib/quote-list"
import { cn } from "@/lib/utils"

type AddToQuoteButtonProps = {
  item: Omit<QuoteListItem, "qty" | "addedAt">
  /** Quantity to add. Without it a new row starts at the seller's minimum order (or 1). */
  qty?: number
  /** icon = 44px round "+" on cards; full = wide primary button. */
  variant: "icon" | "full"
  className?: string
  /** Element whose photo flies to the quote list button. Falls back to the button itself. */
  flyFrom?: RefObject<HTMLElement | null>
}

const FLIGHT_MS = 450
// WAAPI cannot read var(--ease-in-out), so resolve the token once per flight.
const FALLBACK_EASE = "cubic-bezier(0.77, 0, 0.175, 1)"

/** The header's quote list button, if it is actually visible (not scrolled/hidden away). */
function findOnScreenTarget(): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>("[data-quote-list-target]")) {
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) continue
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    if (cx > 0 && cx < window.innerWidth && cy > 0 && cy < window.innerHeight) return el
  }
  return null
}

function centreOnScreen(r: DOMRect) {
  const cx = r.left + r.width / 2
  const cy = r.top + r.height / 2
  return cx > 0 && cx < window.innerWidth && cy > 0 && cy < window.innerHeight
}

/**
 * What flies: a copy of the product photo when `flyFrom` is on screen, else a
 * copy of the round "+" button (icon variant) or a brand dot (full variant).
 */
function buildGhost(
  button: HTMLElement,
  variant: "icon" | "full",
  flyFrom: HTMLElement | null,
): { ghost: HTMLElement; rect: DOMRect } {
  const img =
    flyFrom instanceof HTMLImageElement ? flyFrom : (flyFrom?.querySelector("img") ?? null)
  if (img && img.currentSrc) {
    const rect = img.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0 && centreOnScreen(rect)) {
      const ghost = document.createElement("img")
      ghost.src = img.currentSrc
      ghost.alt = ""
      const fit = getComputedStyle(img)
      ghost.style.objectFit = fit.objectFit
      ghost.style.objectPosition = fit.objectPosition
      ghost.style.borderRadius = "12px"
      ghost.style.boxShadow = "0 8px 24px rgb(0 0 0 / 0.18)"
      return { ghost, rect }
    }
  }

  const rect = button.getBoundingClientRect()
  if (variant === "icon") {
    const ghost = button.cloneNode(true) as HTMLElement
    ghost.removeAttribute("id")
    ghost.setAttribute("tabindex", "-1")
    return { ghost, rect }
  }
  const size = 40
  const ghost = document.createElement("div")
  ghost.style.borderRadius = "999px"
  ghost.style.background = "var(--color-brand-600)"
  const dot = new DOMRect(rect.left + rect.width / 2 - size / 2, rect.top + rect.height / 2 - size / 2, size, size)
  return { ghost, rect: dot }
}

/**
 * Flies a copy of the product photo to the header's quote list button, then
 * bumps its count badge. Transform + opacity only (WAAPI, compositor). No-ops
 * when the button is not on screen or the browser has no WAAPI. The ghost lives
 * on <body>, so it survives the page changing under it and no ancestor's
 * transform or filter can re-anchor it.
 */
function flyToQuoteList(button: HTMLElement, variant: "icon" | "full", flyFrom: HTMLElement | null) {
  if (typeof button.animate !== "function") return
  const target = findOnScreenTarget()
  if (!target) return

  const { ghost, rect } = buildGhost(button, variant, flyFrom)
  const t = target.getBoundingClientRect()
  const dx = t.left + t.width / 2 - (rect.left + rect.width / 2)
  const dy = t.top + t.height / 2 - (rect.top + rect.height / 2)
  // 0.2 per the motion spec, smaller for big photos so they land icon-sized.
  const endScale = Math.min(0.2, 40 / Math.max(rect.width, rect.height))

  ghost.setAttribute("aria-hidden", "true")
  Object.assign(ghost.style, {
    position: "fixed",
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    margin: "0",
    pointerEvents: "none",
    zIndex: "9999",
    overflow: "hidden",
    transformOrigin: "center",
    willChange: "transform, opacity",
  })
  // A cloned button may carry the caller's positioning/transform utilities.
  for (const prop of ["translate", "scale", "rotate"]) ghost.style.setProperty(prop, "none")
  for (const prop of ["right", "bottom"]) ghost.style.setProperty(prop, "auto")
  ghost.style.setProperty("transition", "none")
  document.body.appendChild(ghost)

  const ease =
    getComputedStyle(document.documentElement).getPropertyValue("--ease-in-out").trim() ||
    FALLBACK_EASE
  const flight = ghost.animate(
    [
      { transform: "translate(0px, 0px) scale(1)", opacity: 1 },
      { transform: `translate(${dx}px, ${dy}px) scale(${endScale})`, opacity: 0.6 },
    ],
    // forwards: hold the last frame until onfinish removes the ghost (no flash back).
    { duration: FLIGHT_MS, easing: ease, fill: "forwards" },
  )
  flight.onfinish = () => {
    ghost.remove()
    window.dispatchEvent(new Event(QUOTE_LIST_BUMP_EVENT))
  }
  flight.oncancel = () => ghost.remove()
}

export function AddToQuoteButton({ item, qty, variant, className, flyFrom }: AddToQuoteButtonProps) {
  const { has, add, remove } = useQuoteList()
  const added = has(item.productId)
  const [announcement, setAnnouncement] = useState("")
  // Transitions are on only for the change a pointer tap just made. Off at load,
  // so an item that was already listed never "swaps" when storage is read back,
  // and off again after a keyboard activation, which applies instantly.
  const [animated, setAnimated] = useState(false)

  // The full variant is a button until added, then a link: keep keyboard focus
  // on the control through that element swap.
  const el = useRef<HTMLElement | null>(null)
  const setEl = useCallback((node: HTMLElement | null) => {
    el.current = node
  }, [])
  const refocus = useRef(false)
  useEffect(() => {
    if (!refocus.current) return
    refocus.current = false
    el.current?.focus({ preventScroll: true })
  }, [added])

  function onClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    e.stopPropagation()
    // detail 0 = keyboard (or assistive tech) activation: apply instantly, no motion.
    const byPointer = e.detail !== 0
    setAnimated(byPointer)

    if (added) {
      remove(item.productId)
      setAnnouncement(`Removed ${item.name} from quote list`)
      return
    }

    haptic("tap")
    if (byPointer && !prefersReducedMotion()) {
      // Measure before the state change re-renders the button.
      flyToQuoteList(e.currentTarget, variant, flyFrom?.current ?? null)
    }
    refocus.current = !byPointer && document.activeElement === e.currentTarget
    add({ ...item, qty })
    setAnnouncement(`Added ${item.name} to quote list`)
  }

  const status = (
    <span role="status" className="sr-only">
      {announcement}
    </span>
  )

  if (variant === "full") {
    const swap = animated
      ? "transition-[opacity,scale,filter] duration-[180ms] ease-(--ease-out) starting:scale-90 starting:opacity-0 starting:blur-[2px] motion-reduce:duration-150 motion-reduce:starting:scale-100 motion-reduce:starting:blur-none"
      : ""
    if (added) {
      return (
        <>
          <Link
            ref={setEl}
            href={ROUTES.MARKETPLACE_CART}
            className={cn("btn-tactile btn-tactile--light btn-tactile--block", className)}
          >
            <Check aria-hidden="true" className={cn("size-5", swap)} />
            <span className={swap}>In quote list</span>
            <span className="sr-only">. Open quote list</span>
          </Link>
          {status}
        </>
      )
    }
    return (
      <>
        <button
          ref={setEl}
          type="button"
          aria-pressed={false}
          onClick={onClick}
          className={cn("btn-tactile btn-tactile--block", className)}
        >
          <Plus aria-hidden="true" className="size-5" />
          Add to quote list
        </button>
        {status}
      </>
    )
  }

  // Both icons stay mounted and cross-fade (opacity + scale 0.9 + blur) so a
  // rapid re-tap reverses from wherever the transition currently is.
  const icon = cn(
    "col-start-1 row-start-1 size-5",
    animated &&
      "transition-[opacity,scale,filter] duration-[180ms] ease-(--ease-out) motion-reduce:duration-150",
  )
  const on = "opacity-100 scale-100 blur-none"
  const off = "opacity-0 scale-90 blur-[2px] motion-reduce:scale-100 motion-reduce:blur-none"

  return (
    <>
      <button
        type="button"
        aria-pressed={added}
        aria-label={`Add ${item.name} to quote list`}
        onClick={onClick}
        className={cn(
          "inline-flex size-11 shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-full border shadow-sm [-webkit-tap-highlight-color:transparent]",
          "transition-[scale,background-color,border-color,color] duration-140 ease-(--ease-out)",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2",
          "active:scale-[0.97] motion-reduce:transition-colors motion-reduce:active:scale-100",
          // Hover only on devices that really hover (no sticky hover after a tap).
          // Full class names, not built strings: Tailwind finds classes by scanning source.
          added
            ? "border-brand-600 bg-brand-600 text-white [@media(hover:hover)_and_(pointer:fine)]:hover:border-brand-700 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-brand-700"
            : "border-ink-200 bg-white text-brand-700 [@media(hover:hover)_and_(pointer:fine)]:hover:border-brand-300 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-brand-50",
          className,
        )}
      >
        <span className="grid place-items-center">
          <Plus aria-hidden="true" className={cn(icon, added ? off : on)} />
          <Check aria-hidden="true" className={cn(icon, added ? on : off)} />
        </span>
      </button>
      {status}
    </>
  )
}

"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { ClipboardList } from "lucide-react"

import { ROUTES } from "@/config/routes.config"
import { useQuoteList } from "@/hooks/use-quote-list"
import { QUOTE_LIST_BUMP_EVENT } from "@/lib/quote-list"
import { cn } from "@/lib/utils"

// One half of the 220ms bump (1 -> 1.2 -> 1): 110ms out, 110ms back.
const BUMP_HALF_MS = 110

/**
 * Header entry to the quote list: icon, a count badge once something is
 * listed, and the landing spot for the add-to-quote flight
 * (`data-quote-list-target`). Phones show the round icon; from sm it carries
 * the "Quote list" label so the icon is never the only clue.
 */
export function QuoteListButton({ className }: { className?: string }) {
  const { count, ready } = useQuoteList()
  const onList = usePathname() === ROUTES.MARKETPLACE_CART
  const [bumped, setBumped] = useState(false)
  const linkRef = useRef<HTMLAnchorElement>(null)
  // An add happened while this button was off screen (the bar leaves on
  // scroll-down), so no flight could land on it: pulse the badge once on return.
  const missedBump = useRef(false)
  const lastCount = useRef<number | null>(null)

  // The badge animates on a count change after mount only, never on load or
  // when a page mounts its own bar, so nothing here depends on first render.
  useEffect(() => {
    if (!ready) return
    const before = lastCount.current
    lastCount.current = count
    if (count === 0) missedBump.current = false
    // First read after mount (page load, client navigation) is not a change.
    if (before === null || count <= before) return
    const r = linkRef.current?.getBoundingClientRect()
    const visible =
      !!r &&
      r.width > 0 &&
      r.height > 0 &&
      r.top + r.height / 2 > 0 &&
      r.top + r.height / 2 < window.innerHeight
    // Visible: a flight, when one plays, bumps the badge as it lands.
    if (!visible) missedBump.current = true
  }, [count, ready])

  // Bump on a flight landing, or on the first reveal after a missed add. CSS
  // transitions (not a keyframe) so a second add mid-bump reverses from where
  // the scale currently is.
  useEffect(() => {
    let timer: number | undefined
    function bump() {
      setBumped(true)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setBumped(false), BUMP_HALF_MS)
    }
    window.addEventListener(QUOTE_LIST_BUMP_EVENT, bump)

    const el = linkRef.current
    const reveal =
      el && typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            ([entry]) => {
              if (entry.intersectionRatio >= 0.9 && missedBump.current) {
                missedBump.current = false
                bump()
              }
            },
            { threshold: [0.9] },
          )
        : null
    if (el) reveal?.observe(el)

    return () => {
      window.removeEventListener(QUOTE_LIST_BUMP_EVENT, bump)
      reveal?.disconnect()
      window.clearTimeout(timer)
    }
  }, [])

  const showBadge = ready && count > 0

  return (
    <Link
      ref={linkRef}
      href={ROUTES.MARKETPLACE_CART}
      data-quote-list-target=""
      aria-current={onList ? "page" : undefined}
      aria-label={
        showBadge ? `Quote list, ${count} ${count === 1 ? "product" : "products"}` : "Quote list"
      }
      className={cn(
        "relative inline-flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center gap-2 rounded-full border border-brand-200 bg-white text-sm font-semibold text-brand-700 shadow-sm [-webkit-tap-highlight-color:transparent] sm:w-auto sm:px-4",
        "transition-[scale,background-color,border-color,color] duration-140 ease-(--ease-out)",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2",
        "active:scale-[0.97] motion-reduce:transition-colors motion-reduce:active:scale-100",
        "[@media(hover:hover)_and_(pointer:fine)]:hover:border-brand-300 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-brand-50 [@media(hover:hover)_and_(pointer:fine)]:hover:text-brand-800",
        className,
      )}
    >
      <ClipboardList aria-hidden="true" className="size-5 shrink-0" />
      <span aria-hidden="true" className="hidden sm:inline">
        Quote list
      </span>
      {showBadge ? (
        <span
          aria-hidden="true"
          data-bumped={bumped}
          className="pointer-events-none absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[0.6875rem] font-bold leading-none tabular-nums text-white ring-2 ring-white transition-[scale] duration-110 ease-(--ease-out) data-[bumped=true]:scale-[1.2] motion-reduce:data-[bumped=true]:scale-100"
        >
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  )
}

"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
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

  // A flight landing bumps the badge. CSS transitions (not a keyframe) so a
  // second add mid-bump reverses from where the scale currently is.
  useEffect(() => {
    let timer: number | undefined
    function onBump() {
      setBumped(true)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setBumped(false), BUMP_HALF_MS)
    }
    window.addEventListener(QUOTE_LIST_BUMP_EVENT, onBump)
    return () => {
      window.removeEventListener(QUOTE_LIST_BUMP_EVENT, onBump)
      window.clearTimeout(timer)
    }
  }, [])

  const showBadge = ready && count > 0

  return (
    <Link
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
          className="pointer-events-none absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[0.6875rem] font-bold leading-none tabular-nums text-white ring-2 ring-white transition-[scale,opacity] duration-110 ease-(--ease-out) starting:scale-95 starting:opacity-0 data-[bumped=true]:scale-[1.2] motion-reduce:data-[bumped=true]:scale-100 motion-reduce:starting:scale-100"
        >
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  )
}

"use client"

import { animate, useReducedMotion } from "motion/react"
import { useEffect, useRef, useState } from "react"

import { useDebounce } from "@/hooks/use-debounce"
import { cn } from "@/lib/utils"
import type { ProductPriceTier } from "@/types/marketplace.types"
import { formatTaka } from "@/utils/format-price"

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1]
const TWEEN_S = 0.2
/** The spoken estimate waits for the quantity to settle (a held stepper button changes it many times a second). */
const ANNOUNCE_DELAY_MS = 400

/** The seller's bulk tier that covers `qty` (the deepest one wins), or null. */
export function tierFor(qty: number, tiers?: ProductPriceTier[] | null): ProductPriceTier | null {
  let best: ProductPriceTier | null = null
  for (const tier of tiers ?? []) {
    if (!(tier.price > 0) || qty < tier.minQty) continue
    if (tier.maxQty != null && qty > tier.maxQty) continue
    if (!best || tier.minQty > best.minQty) best = tier
  }
  return best
}

/** The next cheaper tier above `qty`, to nudge bulk buyers. */
function nextTier(qty: number, unitPrice: number, tiers?: ProductPriceTier[] | null) {
  let next: ProductPriceTier | null = null
  for (const tier of tiers ?? []) {
    if (!(tier.price > 0) || tier.minQty <= qty || tier.price >= unitPrice) continue
    if (!next || tier.minQty < next.minQty) next = tier
  }
  return next
}

type PriceEstimateProps = {
  /** Listed unit price; 0 means "Ask for price" and renders nothing. */
  price: number
  tiers?: ProductPriceTier[] | null
  qty: number
  unit: string
  /** Typed / keyboard changes jump straight to the new total. */
  instant: boolean
  className?: string
}

/**
 * "Estimated ৳X for n {unit}". The total tweens (200ms) by writing to the DOM each
 * frame, so the page never re-renders for the animation. Uses the seller's bulk
 * tiers when there are any. Indicative only: the seller confirms the final price.
 * Screen readers get the same sentence from a separate live region, updated
 * 400ms after the last change, so holding a stepper button is one announcement.
 */
export function PriceEstimate({ price, tiers, qty, unit, instant, className }: PriceEstimateProps) {
  const tier = tierFor(qty, tiers)
  const unitPrice = tier?.price ?? price
  const total = Math.round(unitPrice * qty * 100) / 100
  const sentence = `Estimated ${formatTaka(total)} for ${qty} ${unit}`
  const announced = useDebounce(sentence, ANNOUNCE_DELAY_MS)
  if (!(unitPrice > 0)) return null

  const next = nextTier(qty, unitPrice, tiers)

  return (
    <div className={cn("text-sm text-ink-600", className)}>
      {/* Visual only: the tween and every intermediate quantity stay silent. */}
      <p aria-hidden="true">
        Estimated{" "}
        <TweenedTaka value={total} instant={instant} className="font-extrabold tabular-nums text-ink-900" />{" "}
        for <span className="tabular-nums">{qty}</span> {unit}
      </p>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announced}
      </p>
      {tier && tier.price !== price ? (
        <p className="mt-0.5 text-xs text-ink-500">
          Bulk rate {formatTaka(tier.price)} / {unit} applied
          {tier.note ? ` · ${tier.note}` : null}
        </p>
      ) : next ? (
        <p className="mt-0.5 text-xs text-ink-500">
          {formatTaka(next.price)} / {unit} from {next.minQty} {unit}
        </p>
      ) : null}
    </div>
  )
}

function TweenedTaka({ value, instant, className }: { value: number; instant: boolean; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const shown = useRef(value)
  const reduceMotion = useReducedMotion()
  // React prints the first total only. Later totals are written by the effect, so
  // React never touches this text again and the tween owns it.
  const [firstText] = useState(() => formatTaka(value))

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const from = shown.current
    if (from === value) return
    if (instant || reduceMotion || !Number.isFinite(from)) {
      shown.current = value
      el.textContent = formatTaka(value)
      return
    }
    // Interruptible: a new value stops this tween and starts from wherever it got to.
    const controls = animate(from, value, {
      duration: TWEEN_S,
      ease: EASE_OUT,
      onUpdate: (n) => {
        shown.current = n
        el.textContent = formatTaka(value >= 100 ? Math.round(n) : n)
      },
      onComplete: () => {
        shown.current = value
        el.textContent = formatTaka(value)
      },
    })
    return () => controls.stop()
  }, [value, instant, reduceMotion])

  return (
    <span ref={ref} className={className}>
      {firstText}
    </span>
  )
}

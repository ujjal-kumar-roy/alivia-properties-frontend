"use client"

import Link from "next/link"
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { AnimatePresence, animate, motion, useReducedMotion } from "motion/react"
import {
  ArrowDown,
  Check,
  ClipboardList,
  ListChecks,
  Loader2,
  Minus,
  Package,
  Plus,
  SendHorizontal,
  Trash2,
} from "lucide-react"

import { MobileActionBar } from "@/components/common/mobile-action-bar"
import { Sk } from "@/components/common/skeletons"
import { GetQuoteForm, type QuoteItemRequest } from "@/components/marketplace/GetQuoteForm"
import { MediaImage } from "@/components/marketplace/MediaImage"
import { ROUTES } from "@/config/routes.config"
import { useQuoteList } from "@/hooks/use-quote-list"
import { haptic, prefersReducedMotion } from "@/lib/celebrate"
import { reducedTransition } from "@/lib/motion"
import type { QuoteListItem } from "@/lib/quote-list"
import { cn } from "@/lib/utils"
// Exact taka with lakh grouping (৳1,25,000), not formatPrice()'s rounded "৳1.3 Lakh":
// this is the review step before asking sellers, so the figures should add up.
import { formatTaka } from "@/utils/format-price"

const FORM_ID = "quote-list-form"
const MAX_QTY = 999_999
const UNDO_MS = 8000
/** Exponential ease-out (globals.css --ease-out) for motion props. */
const EASE_OUT = [0.23, 1, 0.32, 1] as const

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`
}

/** The stepper's floor: the seller's minimum order, at least 1. */
function minQty(item: QuoteListItem) {
  return Math.max(1, Math.ceil(item.moq || 1))
}

/** The quantity shown, estimated and sent: a stored qty below the minimum reads as the minimum. */
function qtyOf(item: QuoteListItem) {
  return Math.min(MAX_QTY, Math.max(minQty(item), Math.floor(item.qty) || 0))
}

const PRESS =
  "transition-[background-color,color,scale] duration-140 ease-(--ease-out) active:scale-[0.97] motion-reduce:active:scale-100"
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"

/**
 * The quote list page body: the products the buyer collected (quantity,
 * estimate, remove with undo), an estimated total, and one form that sends a
 * request per product to its seller (GetQuoteForm "items" mode). Everything is
 * read from this device's list, so nothing renders until it has hydrated.
 */
export function QuoteListView() {
  const { items, ready, add, remove, setQty } = useQuoteList()
  const reduceMotion = useReducedMotion()
  const [sending, setSending] = useState(false)
  // Every request went through and the thank-you page is loading: show a calm
  // "sent" note instead of flashing the empty state.
  const [leaving, setLeaving] = useState(false)
  const [removed, setRemoved] = useState<QuoteListItem | null>(null)
  // Typed quantities apply instantly; button taps tween the estimates.
  const [instant, setInstant] = useState(false)
  const [detailsInView, setDetailsInView] = useState(false)
  const detailsRef = useRef<HTMLDivElement | null>(null)
  const detailsHeadingRef = useRef<HTMLHeadingElement>(null)

  // Back from the thank-you page (back/forward cache): drop the "sent" note.
  useEffect(() => {
    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) setLeaving(false)
    }
    window.addEventListener("pageshow", onPageShow)
    return () => window.removeEventListener("pageshow", onPageShow)
  }, [])

  // The undo offer for a removed row expires on its own.
  useEffect(() => {
    if (!removed) return
    const timer = window.setTimeout(() => setRemoved(null), UNDO_MS)
    return () => window.clearTimeout(timer)
  }, [removed])

  // Phones: the bottom bar reads "Add your details" until the form is on screen.
  const observeDetails = useCallback((el: HTMLDivElement | null) => {
    detailsRef.current = el
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setDetailsInView(entry.isIntersecting),
      { rootMargin: "0px 0px -35% 0px" },
    )
    observer.observe(el)
    return () => {
      observer.disconnect()
      detailsRef.current = null
    }
  }, [])

  function goToDetails() {
    detailsRef.current?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "start",
    })
    // Focus the heading, not a field, so phones do not pop the keyboard mid-scroll.
    detailsHeadingRef.current?.focus({ preventScroll: true })
  }

  function handleRemove(item: QuoteListItem) {
    haptic("tap")
    setInstant(false)
    setRemoved(item)
    remove(item.productId)
  }

  function handleUndo() {
    if (!removed) return
    add({ ...removed })
    setRemoved(null)
  }

  function handleQty(item: QuoteListItem, next: number, source: "button" | "keyboard") {
    setInstant(source === "keyboard")
    setQty(item.productId, Math.min(MAX_QTY, Math.max(minQty(item), next)))
  }

  // Every request is in and the thank-you page is loading.
  function handleAllSent() {
    setLeaving(true)
    setRemoved(null)
  }

  if (!ready) return <QuoteListSkeleton />

  const sellers = new Set(items.map((item) => item.supplierId ?? item.supplierName ?? item.productId)).size
  const total = items.reduce((sum, item) => (item.price > 0 ? sum + item.price * qtyOf(item) : sum), 0)
  const unpriced = items.filter((item) => !(item.price > 0)).length
  const requestItems: QuoteItemRequest[] = items.map((item) => ({
    productId: item.productId,
    name: item.name,
    quantity: qtyOf(item),
    unit: item.unit || undefined,
    supplierId: item.supplierId,
  }))

  const rowHidden = reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }
  const rowShown = reduceMotion ? { opacity: 1 } : { opacity: 1, height: "auto" }
  const rowTransition = reduceMotion ? reducedTransition : { duration: 0.2, ease: EASE_OUT }
  // Rows leave one by one as their requests land; keep the form mounted until the run ends.
  const viewKey = leaving ? "sent" : items.length || sending ? "list" : "empty"

  const undo = (
    <AnimatePresence initial={false}>
      {removed ? <UndoStrip key={removed.productId} item={removed} onUndo={handleUndo} /> : null}
    </AnimatePresence>
  )

  return (
    <>
      {/* Persistent live region: inserted nodes are not reliably announced. */}
      <p className="sr-only" aria-live="polite">
        {removed ? `Removed ${removed.name} from your quote list. Undo is available.` : ""}
      </p>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={viewKey}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.2, ease: EASE_OUT } }}
          exit={{ opacity: 0, transition: { duration: 0.15, ease: EASE_OUT } }}
        >
          {viewKey === "sent" ? (
            <SentNote />
          ) : viewKey === "empty" ? (
            <>
              <div className="mt-4">{undo}</div>
              <EmptyQuoteList />
            </>
          ) : (
            <>
              <p className="mt-1 text-sm text-ink-600">
                {plural(items.length, "item")} from {plural(sellers, "seller")}. Each product goes to
                its seller as a separate request, and the seller replies with a price.
              </p>

              <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_25rem] lg:items-start lg:gap-8">
                <div className="min-w-0">
                  <ul
                    aria-label="Products in your quote list"
                    className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-white shadow-(--shadow-card)"
                  >
                    <AnimatePresence initial={false}>
                      {items.map((item) => (
                        <motion.li
                          key={item.productId}
                          // Height collapses with the fade so the rows below close the gap.
                          className="overflow-hidden"
                          initial={rowHidden}
                          animate={rowShown}
                          exit={rowHidden}
                          transition={rowTransition}
                        >
                          <QuoteRow
                            item={item}
                            disabled={sending}
                            instant={instant}
                            onQty={(next, source) => handleQty(item, next, source)}
                            onRemove={() => handleRemove(item)}
                          />
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>

                  <div className="mt-3">{undo}</div>

                  <Link
                    href={ROUTES.MARKETPLACE}
                    className={cn(
                      "mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-full px-1 text-sm font-bold text-brand-700 hover:text-brand-800",
                      PRESS,
                      FOCUS,
                    )}
                  >
                    <Plus aria-hidden="true" className="size-4" />
                    Add more items
                  </Link>
                </div>

                <section
                  aria-label="Estimate and your details"
                  className="rounded-2xl border border-border/70 bg-white p-4 shadow-(--shadow-card) sm:p-6"
                >
                  <EstimateSummary total={total} unpriced={unpriced} instant={instant} />

                  <div
                    ref={observeDetails}
                    className="mt-5 scroll-mt-20 border-t border-border/60 pt-5"
                  >
                    <h2
                      ref={detailsHeadingRef}
                      tabIndex={-1}
                      className="font-sans text-lg font-bold text-ink-900 outline-none"
                    >
                      Your details
                    </h2>
                    <p className="mt-1 text-sm text-ink-600">
                      Sellers use these to reply. You get a confirmation email for each request.
                    </p>
                    <GetQuoteForm
                      className="mt-4"
                      mode="items"
                      items={requestItems}
                      formId={FORM_ID}
                      hideSubmit="phones"
                      redirectOnSuccess
                      // Write-through: a product leaves the list the moment its request is confirmed.
                      onItemSent={remove}
                      onAllItemsSent={handleAllSent}
                      onSubmittingChange={setSending}
                    />
                  </div>
                </section>
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Outside the fading view: a transformed ancestor would pin the bar to it, not the screen. */}
      {viewKey === "list" ? (
        <MobileActionBar label="Send your quote request">
          <div className="min-w-0 shrink-0 pl-3 pr-1">
            <p className="text-[0.6875rem] font-medium leading-tight text-ink-600">
              {plural(items.length, "item")}
            </p>
            {total > 0 ? (
              <p className="text-sm font-extrabold leading-tight text-ink-900">
                <Amount value={total} instant={instant} />
              </p>
            ) : (
              <p className="text-xs font-semibold leading-tight text-ink-800">Ask for price</p>
            )}
          </div>
          {detailsInView || sending ? (
            <button
              key="send"
              type="submit"
              form={FORM_ID}
              disabled={sending}
              className="btn-tactile flex-1"
            >
              {sending ? (
                <>
                  <Loader2 aria-hidden="true" className="size-4 motion-safe:animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  {/* No count: the form may hold back an item it could not confirm. */}
                  {items.length === 1 ? "Send request" : "Send requests"}
                  <SendHorizontal aria-hidden="true" className="size-4" />
                </>
              )}
            </button>
          ) : (
            // A separate button (own key), so a double tap never turns into a submit.
            <button key="details" type="button" onClick={goToDetails} className="btn-tactile flex-1">
              Add your details
              <ArrowDown aria-hidden="true" className="size-4" />
            </button>
          )}
        </MobileActionBar>
      ) : null}
    </>
  )
}

function QuoteRow({
  item,
  disabled,
  instant,
  onQty,
  onRemove,
}: {
  item: QuoteListItem
  disabled: boolean
  instant: boolean
  onQty: (next: number, source: "button" | "keyboard") => void
  onRemove: () => void
}) {
  const min = minQty(item)
  const qty = qtyOf(item)
  const productHref = ROUTES.MARKETPLACE_PRODUCT(item.slug)
  const priced = item.price > 0

  return (
    <div className="px-3 py-3.5 sm:px-4 sm:py-4">
      <div className="flex gap-3 sm:gap-4">
        {/* Same destination as the name link, so it is skipped by keyboard and screen readers. */}
        <Link
          href={productHref}
          tabIndex={-1}
          aria-hidden="true"
          className="relative size-18 shrink-0 overflow-hidden rounded-xl bg-brand-50 sm:size-20"
        >
          <MediaImage
            src={item.image}
            alt=""
            fill
            sizes="80px"
            className="object-cover"
            fallback={
              <span className="flex size-full items-center justify-center text-brand-300">
                <Package aria-hidden="true" className="size-6" />
              </span>
            }
          />
        </Link>

        <div className="min-w-0 flex-1">
          <Link
            href={productHref}
            className={cn(
              "line-clamp-2 rounded-sm text-sm font-bold leading-snug text-ink-900 transition-colors duration-160 ease-(--ease-out) hover:text-brand-700 sm:text-[0.9375rem]",
              FOCUS,
            )}
          >
            {item.name}
          </Link>
          {item.supplierName ? (
            <p className="mt-0.5 truncate text-xs text-ink-600">
              {item.supplierSlug ? (
                <Link
                  href={ROUTES.MARKETPLACE_SUPPLIER(item.supplierSlug)}
                  className={cn(
                    "rounded-sm font-medium transition-colors duration-160 ease-(--ease-out) hover:text-brand-700",
                    FOCUS,
                  )}
                >
                  {item.supplierName}
                </Link>
              ) : (
                item.supplierName
              )}
            </p>
          ) : null}
          <p className="mt-1 text-[0.8125rem] font-semibold tabular-nums text-ink-800">
            {priced ? (
              <>
                {formatTaka(item.price)}
                {item.unit ? <span className="font-medium text-ink-500"> / {item.unit}</span> : null}
              </>
            ) : (
              <span className="text-ink-600">Ask for price</span>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label={`Remove ${item.name}`}
          className={cn(
            "-mr-2 -mt-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink-500 hover:bg-ink-100 hover:text-ink-900 disabled:pointer-events-none disabled:opacity-40",
            PRESS,
            FOCUS,
          )}
        >
          <Trash2 aria-hidden="true" className="size-4.5" />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 sm:pl-24">
        <div className="flex min-w-0 items-center gap-2">
          <QtyStepper
            value={qty}
            min={min}
            name={item.name}
            disabled={disabled}
            onChange={onQty}
          />
          {item.unit ? (
            <span className="max-w-20 truncate text-xs font-medium text-ink-600">{item.unit}</span>
          ) : null}
        </div>
        <p className="ml-auto text-right leading-tight">
          {priced ? (
            <>
              <span className="block text-[0.6875rem] font-medium text-ink-500">Estimate</span>
              <span className="text-sm font-extrabold text-ink-900">
                <Amount value={item.price * qty} instant={instant} />
              </span>
            </>
          ) : (
            <span className="text-xs text-ink-500">Seller sets the price</span>
          )}
        </p>
      </div>
      {min > 1 ? (
        <p className="mt-1.5 text-[0.6875rem] text-ink-500 sm:pl-24">
          Minimum order {min}
          {item.unit ? ` ${item.unit}` : ""}
        </p>
      ) : null}
    </div>
  )
}

const STEP_BUTTON = cn(
  "inline-flex size-11 items-center justify-center rounded-full text-ink-800 hover:bg-ink-100 disabled:pointer-events-none disabled:text-ink-300",
  PRESS,
  FOCUS,
)

/**
 * − n + with a typed value. Buttons step by one; typing commits on blur or
 * Enter, arrow keys step instantly. The caller clamps to the minimum.
 */
function QtyStepper({
  value,
  min,
  name,
  disabled,
  onChange,
}: {
  value: number
  min: number
  name: string
  disabled: boolean
  onChange: (next: number, source: "button" | "keyboard") => void
}) {
  // What the buyer is typing; null shows the stored value.
  const [draft, setDraft] = useState<string | null>(null)

  function commit() {
    if (draft === null) return
    const next = Math.floor(Number(draft))
    setDraft(null)
    if (Number.isFinite(next) && next > 0 && next !== value) onChange(next, "keyboard")
  }

  return (
    <div
      role="group"
      aria-label={`Quantity of ${name}`}
      className="inline-flex shrink-0 items-center rounded-full border border-border bg-white has-[input:focus-visible]:border-brand-400 has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-brand-400/30"
    >
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={disabled || value <= min}
        onClick={() => onChange(value - 1, "button")}
        className={STEP_BUTTON}
      >
        <Minus aria-hidden="true" className="size-4" />
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label="Quantity"
        value={draft ?? String(value)}
        disabled={disabled}
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => setDraft(event.target.value.replace(/\D/g, "").slice(0, 6))}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault()
            commit()
          } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault()
            setDraft(null)
            onChange(value + (event.key === "ArrowUp" ? 1 : -1), "keyboard")
          }
        }}
        className="h-11 w-16 bg-transparent text-center text-base font-bold tabular-nums text-ink-900 outline-none disabled:text-ink-400 sm:w-14 sm:text-sm"
      />
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={disabled || value >= MAX_QTY}
        onClick={() => onChange(value + 1, "button")}
        className={STEP_BUTTON}
      >
        <Plus aria-hidden="true" className="size-4" />
      </button>
    </div>
  )
}

function EstimateSummary({
  total,
  unpriced,
  instant,
}: {
  total: number
  unpriced: number
  instant: boolean
}) {
  if (total <= 0) {
    return (
      <div>
        <p className="text-sm font-bold text-ink-900">Prices come from the sellers</p>
        <p className="mt-1 text-xs leading-relaxed text-ink-600">
          None of these items has a listed price. Each seller replies with theirs.
        </p>
      </div>
    )
  }
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-bold text-ink-800">Estimated total</p>
        <p className="text-2xl font-extrabold text-ink-900">
          <Amount value={total} instant={instant} />
        </p>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-ink-600">
        Sellers confirm final prices.
        {unpriced > 0
          ? ` Not counting ${plural(unpriced, "item")} without a listed price.`
          : ""}
      </p>
    </div>
  )
}

/**
 * A taka amount that tweens (220ms, ease-out) when it changes from a tap, and
 * jumps for typed input or reduced motion. Written straight to the DOM so the
 * tween never re-renders React; the sr-only copy always holds the real value.
 */
function Amount({ value, instant }: { value: number; instant: boolean }) {
  const ref = useRef<HTMLSpanElement>(null)
  const shown = useRef<number | null>(null)

  // Layout effect: the first value is in place before paint (the span renders empty).
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const from = shown.current
    if (from === null || from === value || instant || prefersReducedMotion()) {
      shown.current = value
      el.textContent = formatTaka(value)
      return
    }
    const controls = animate(from, value, {
      duration: 0.22,
      ease: EASE_OUT,
      onUpdate: (n) => {
        shown.current = n
        el.textContent = formatTaka(n)
      },
      onComplete: () => {
        shown.current = value
        el.textContent = formatTaka(value)
      },
    })
    return () => controls.stop()
  }, [value, instant])

  return (
    <>
      <span ref={ref} aria-hidden="true" className="tabular-nums" />
      <span className="sr-only">{formatTaka(value)}</span>
    </>
  )
}

function UndoStrip({ item, onUndo }: { item: QuoteListItem; onUndo: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: EASE_OUT }}
      className="flex items-center justify-between gap-3 rounded-xl bg-ink-900 py-1 pl-4 pr-1 text-sm text-white"
    >
      <span className="min-w-0 truncate">Removed {item.name}</span>
      <button
        type="button"
        onClick={onUndo}
        className={cn(
          "min-h-11 shrink-0 rounded-lg px-4 font-bold text-gold-300 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300",
          PRESS,
        )}
      >
        Undo
      </button>
    </motion.div>
  )
}

function EmptyQuoteList() {
  const steps = [
    {
      icon: Plus,
      solid: true,
      text: (
        <>
          <span className="font-bold text-ink-900">Tap + on a product</span>, or{" "}
          <span className="font-bold text-ink-900">Add to quote list</span> on its page.
        </>
      ),
    },
    { icon: ListChecks, solid: false, text: <>Come back here and set how many you need.</> },
    {
      icon: SendHorizontal,
      solid: false,
      text: (
        <>Send your list. Each product goes to its seller as a separate request, free and with no obligation.</>
      ),
    },
  ]

  return (
    <div className="mt-6 max-w-lg sm:mt-8">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
        <ClipboardList aria-hidden="true" className="size-7" />
      </span>
      <h2 className="mt-4 font-sans text-xl font-bold text-ink-900">Your quote list is empty</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
        Collect products from any seller here, then ask for all their prices in one go.
      </p>

      <ol className="mt-5 grid gap-3">
        {steps.map(({ icon: Icon, solid, text }, index) => (
          <li key={index} className="flex items-center gap-3">
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full",
                solid ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-700",
              )}
            >
              <Icon aria-hidden="true" className="size-4" />
            </span>
            <p className="text-sm leading-snug text-ink-700">{text}</p>
          </li>
        ))}
      </ol>

      <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
        <Link href={ROUTES.MARKETPLACE} className="btn-tactile">
          Browse the marketplace
        </Link>
        <Link href={ROUTES.MARKETPLACE_REQUEST} className="btn-glass min-h-11">
          Describe what you need
        </Link>
      </div>
    </div>
  )
}

function SentNote() {
  return (
    <div role="status" className="mt-8 flex max-w-md items-start gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-700">
        <Check aria-hidden="true" className="size-5" />
      </span>
      <div>
        <p className="text-base font-bold text-ink-900">Requests sent</p>
        <p className="mt-0.5 text-sm text-ink-600">Opening your confirmation...</p>
      </div>
    </div>
  )
}

function QuoteListSkeleton() {
  return (
    <div className="mt-5">
      <p className="sr-only" role="status">
        Loading your quote list
      </p>
      <div
        aria-hidden="true"
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_25rem] lg:items-start lg:gap-8"
      >
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-white">
          {[0, 1].map((row) => (
            <div
              key={row}
              className="flex gap-3 border-b border-border/60 px-3 py-4 last:border-0 sm:gap-4 sm:px-4"
            >
              <Sk className="size-18 shrink-0 rounded-xl sm:size-20" />
              <div className="flex-1 space-y-2 pt-1">
                <Sk className="h-4 w-4/5" />
                <Sk className="h-3 w-1/3" />
                <Sk className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
        <Sk className="h-72 rounded-2xl" />
      </div>
    </div>
  )
}

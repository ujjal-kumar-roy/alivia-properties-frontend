"use client"

import Link from "next/link"
import { useCallback, useEffect, useId, useMemo, useRef, useState, type RefObject } from "react"
import {
  Boxes,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  ListChecks,
  MessageCircle,
  Phone,
  Truck,
  type LucideIcon,
} from "lucide-react"

import { MobileActionBar } from "@/components/common/mobile-action-bar"
import { PriceEstimate, tierFor } from "@/components/marketplace/product/PriceEstimate"
import {
  QuantityStepper,
  STEADY_CHANGE,
  type QuantityChange,
} from "@/components/marketplace/product/QuantityStepper"
import { AddToQuoteButton } from "@/components/marketplace/quote-list/AddToQuoteButton"
import { useQuoteList } from "@/hooks/use-quote-list"
import { haptic } from "@/lib/celebrate"
import { cn } from "@/lib/utils"
import type { ProductWithSupplier } from "@/services/marketplace.service"
import { formatTaka } from "@/utils/format-price"

type BuyBoxProps = {
  product: ProductWithSupplier
  serviceMode: boolean
  /** Single-product quote form link (already carries productId/productSlug/supplierSlug). */
  quoteHref: string
  call: string | null
  whatsapp: string | null
}

type Fact = { key: string; icon: LucideIcon; text: string; tone?: string }

/** Stepper changes reach the saved quote list after this pause (a held button fires ~20/s). */
const LIST_WRITE_DELAY_MS = 200
/** Screen-reader quantity updates wait for the number to settle. */
const ANNOUNCE_DELAY_MS = 300

const HOVER = "[@media(hover:hover)_and_(pointer:fine)]:hover"

const outlineButton = cn(
  "inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-ink-200 bg-white text-sm font-bold text-brand-800",
  "transition-[scale,background-color,border-color] duration-140 ease-(--ease-out) active:scale-[0.97] active:bg-ink-50 motion-reduce:transition-colors motion-reduce:active:scale-100",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2",
  `${HOVER}:border-brand-200 ${HOVER}:bg-brand-50/60`,
)

/**
 * The gallery's first photo (the gallery tags it #product-hero-image), looked up
 * lazily when the add button fires: the gallery owns that node and may re-render
 * it, so a ref captured at mount could be stale. AddToQuoteButton flies the photo
 * only while it is on screen (from the phone bar it is scrolled away) and otherwise
 * flies from the button itself.
 */
function useHeroImage(): RefObject<HTMLElement | null> {
  return useMemo(
    () => ({
      get current() {
        return typeof document === "undefined" ? null : document.getElementById("product-hero-image")
      },
    }),
    [],
  )
}

/**
 * Price, facts, quantity, estimate and the quote actions for a product page. On
 * phones it also renders the bottom MobileActionBar (compact quantity + add button,
 * same quantity state), which slides up only once this in-page box has scrolled out
 * of view and slides away again when it comes back, so it never covers these buttons.
 */
export function BuyBox({ product, serviceMode, quoteHref, call, whatsapp }: BuyBoxProps) {
  const unit = product.unit
  // MOQ as the seller gave it (may be fractional, e.g. 0.5 Ton); the stepper counts whole units from 1.
  const moq = typeof product.moq === "number" && product.moq > 0 ? product.moq : null
  const minQty = Math.max(1, Math.ceil(moq ?? 1))
  const lead =
    typeof product.leadTimeDays === "number" && product.leadTimeDays > 0 ? product.leadTimeDays : null
  // Sellers mark not-yet-released items in the unit ("Pcs (Upcoming)"); "In stock" and
  // "Ships in 1 day" are API defaults there, not claims, so don't show them.
  const upcoming = /upcoming/i.test(unit)
  const sellerName = product.supplier?.name ?? (serviceMode ? "the provider" : "the seller")

  // The saved quote list is read after hydration (`ready`), so server and first client
  // render agree and a listed product then shows its saved quantity.
  const { items, ready, setQty: setQuoteListQty } = useQuoteList()
  const listed = ready ? items.find((row) => row.productId === product.id) : undefined

  // null until the buyer uses a stepper: until then the quantity is the listed one
  // (return visit) or the minimum. Afterwards it is theirs and is written to the list.
  const [touched, setTouched] = useState<{ value: number; change: QuantityChange } | null>(null)
  const qty = touched ?? { value: listed ? Math.max(minQty, listed.qty) : minQty, change: STEADY_CHANGE }

  // Debounced write-through: setQuoteListQty is a no-op while the product is not listed,
  // so this needs no "is it listed" check (and a stale closure during a held repeat is harmless).
  const pendingWrite = useRef<{ timer: number | undefined; value: number | null }>({
    timer: undefined,
    value: null,
  })
  const flushWrite = useCallback(() => {
    const pending = pendingWrite.current
    window.clearTimeout(pending.timer)
    pending.timer = undefined
    if (pending.value !== null) {
      setQuoteListQty(product.id, pending.value)
      pending.value = null
    }
  }, [product.id, setQuoteListQty])
  // Leaving the page (or the tab going away) must not drop the last change.
  useEffect(() => {
    window.addEventListener("pagehide", flushWrite)
    return () => {
      window.removeEventListener("pagehide", flushWrite)
      flushWrite()
    }
  }, [flushWrite])

  // Screen readers: the estimate line announces itself; when there is no estimate (price 0)
  // or the change also edits the quote list, say so here, once the number settles.
  const [announcement, setAnnouncement] = useState("")
  const announceTimer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(announceTimer.current), [])

  const onQty = (value: number, change: QuantityChange) => {
    setTouched({ value, change })
    pendingWrite.current.value = value
    window.clearTimeout(pendingWrite.current.timer)
    pendingWrite.current.timer = window.setTimeout(flushWrite, LIST_WRITE_DELAY_MS)

    const hasEstimate = (tierFor(value, product.priceTiers)?.price ?? product.price) > 0
    const message = hasEstimate
      ? listed
        ? `Quote list updated to ${value} ${unit}`
        : ""
      : `Quantity ${value} ${unit}${listed ? ", quote list updated" : ""}`
    window.clearTimeout(announceTimer.current)
    announceTimer.current = window.setTimeout(() => setAnnouncement(message), ANNOUNCE_DELAY_MS)
  }

  const quantityId = useId()
  const heroImage = useHeroImage()

  const item = useMemo(
    () => ({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.image,
      price: product.price,
      unit: product.unit,
      moq: product.moq,
      supplierId: product.supplierId,
      supplierSlug: product.supplier?.slug,
      supplierName: product.supplier?.name,
    }),
    [product],
  )

  // Phone bar: shown while the in-page box is out of view (scrolled past, or not yet
  // reached on a short screen). The top margin covers the sticky breadcrumb bar, so
  // the box counts as gone once its last buttons slide under it.
  const boxRef = useRef<HTMLElement>(null)
  const [barShown, setBarShown] = useState(false)
  useEffect(() => {
    const box = boxRef.current
    if (!box || typeof IntersectionObserver === "undefined") return
    const observer = new IntersectionObserver(
      ([entry]) => setBarShown(!entry.isIntersecting),
      { rootMargin: "-56px 0px 0px 0px" },
    )
    observer.observe(box)
    return () => observer.disconnect()
  }, [])

  const askHref = `${quoteHref}&qty=${qty.value}&unit=${encodeURIComponent(unit)}`

  const facts: Fact[] = [
    upcoming
      ? { key: "stock", icon: Clock3, text: "Upcoming", tone: "text-amber-600" }
      : product.inStock
        ? { key: "stock", icon: CheckCircle2, text: serviceMode ? "Available now" : "In stock", tone: "text-success" }
        : { key: "stock", icon: Clock3, text: serviceMode ? "Schedule needed" : "On order", tone: "text-amber-600" },
  ]
  if (lead && !upcoming) {
    facts.push({
      key: "lead",
      icon: serviceMode ? CalendarClock : Truck,
      text: `${serviceMode ? "Visit" : "Ships"} in ${lead} day${lead === 1 ? "" : "s"}`,
    })
  }
  if (moq) {
    facts.push({
      key: "moq",
      icon: Boxes,
      text: `${serviceMode ? "Min. booking" : "Min. order"} ${moq} ${unit}`,
    })
  }

  return (
    <div>
      <section ref={boxRef} aria-label={serviceMode ? "Rate and booking" : "Price and quote"} className="grid gap-4">
        {/* Price: the listed figure, or "Ask for price" (the catalogue stores 0). */}
        <div>
          {product.price > 0 ? (
            <p className="flex flex-wrap items-baseline gap-x-1.5">
              <span className="text-3xl font-extrabold tracking-tight tabular-nums text-ink-900">
                {formatTaka(product.price)}
              </span>
              <span className="text-base font-semibold text-ink-500">/ {unit}</span>
            </p>
          ) : (
            <p className="text-2xl font-extrabold tracking-tight text-brand-700 sm:text-3xl">Ask for price</p>
          )}
          <p className="mt-1 text-[0.8125rem] leading-snug text-ink-500">
            {serviceMode
              ? "Final rate from the provider after scope, area and schedule"
              : "Final price from the seller after quantity and delivery"}
          </p>
        </div>

        <ul className="flex divide-x divide-ink-200 rounded-xl border border-ink-200">
          {facts.map(({ key, icon: Icon, text, tone }) => (
            <li
              key={key}
              className="flex min-w-0 flex-1 basis-0 flex-col items-center gap-1 px-2 py-2.5 text-center"
            >
              <Icon aria-hidden="true" className={cn("size-4 shrink-0", tone ?? "text-ink-500")} />
              <span className="text-[0.8125rem] font-semibold leading-tight text-ink-800">{text}</span>
            </li>
          ))}
        </ul>

        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor={quantityId} className="min-w-0">
              <span className="block text-sm font-semibold text-ink-900">
                {serviceMode ? "How many" : "Quantity"}
              </span>
              <span className="block truncate text-xs text-ink-500">{unit}</span>
            </label>
            <QuantityStepper
              id={quantityId}
              value={qty.value}
              min={minQty}
              change={qty.change}
              onChange={onQty}
              label={`Quantity (${unit})`}
            />
          </div>
          <PriceEstimate
            price={product.price}
            tiers={product.priceTiers}
            qty={qty.value}
            unit={unit}
            instant={qty.change.instant}
          />
          {/* Listed: the stepper edits the saved quantity, so say what is in the list. */}
          {listed ? (
            <p className="flex items-center gap-1.5 text-[0.8125rem] font-semibold text-brand-700 transition-[opacity,translate] duration-200 ease-(--ease-out) starting:translate-y-2 starting:opacity-0 motion-reduce:starting:translate-y-0">
              <ListChecks aria-hidden="true" className="size-4 shrink-0" />
              <span>
                In your quote list · <span className="tabular-nums">{qty.value}</span> {unit}
              </span>
            </p>
          ) : null}
        </div>

        <div className="grid gap-2.5">
          <AddToQuoteButton variant="full" item={item} qty={qty.value} flyFrom={heroImage} className="w-full" />
          <div className="flex items-center gap-2">
            <Link
              href={askHref}
              // The href changes with every quantity step; don't prefetch each one.
              prefetch={false}
              onClick={() => haptic("tap")}
              className={cn(outlineButton, "min-w-0 flex-1 px-4")}
            >
              <FileText aria-hidden="true" className="size-4 shrink-0" />
              Ask for price now
            </Link>
            {call ? (
              <a href={call} aria-label={`Call ${sellerName}`} className={cn(outlineButton, "size-12 shrink-0")}>
                <Phone aria-hidden="true" className="size-4" />
              </a>
            ) : null}
            {whatsapp ? (
              <a
                href={whatsapp}
                target="_blank"
                rel="noreferrer"
                aria-label={`WhatsApp ${sellerName}`}
                className={cn(outlineButton, "size-12 shrink-0")}
              >
                <MessageCircle aria-hidden="true" className="size-4" />
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <p role="status" className="sr-only">
        {announcement}
      </p>

      {/* Hidden bar is inert: off screen, out of the tab order and the a11y tree. */}
      <div inert={!barShown}>
        <MobileActionBar
          label={serviceMode ? "Book this service" : "Quote this product"}
          className={cn(
            "transition-[translate,opacity] duration-320 ease-(--ease-drawer) motion-reduce:transition-opacity motion-reduce:duration-150",
            barShown
              ? "translate-y-0 opacity-100"
              : "pointer-events-none translate-y-[calc(100%+3rem+env(safe-area-inset-bottom))] motion-reduce:translate-y-0 motion-reduce:opacity-0",
          )}
        >
          <QuantityStepper
            compact
            value={qty.value}
            min={minQty}
            change={qty.change}
            onChange={onQty}
            label={`Quantity (${unit})`}
          />
          {/* Slightly tighter type and padding so "Add to quote list" fits beside the
              stepper on a 360px phone. */}
          <AddToQuoteButton
            variant="full"
            item={item}
            qty={qty.value}
            flyFrom={heroImage}
            className="min-w-0 flex-1 gap-1.5 px-3 text-sm"
          />
        </MobileActionBar>
      </div>
    </div>
  )
}

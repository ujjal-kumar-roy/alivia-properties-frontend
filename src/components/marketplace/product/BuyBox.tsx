"use client"

import Link from "next/link"
import { useCallback, useEffect, useId, useMemo, useRef, useState, type RefObject } from "react"
import {
  Boxes,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  MessageCircle,
  Phone,
  Truck,
  type LucideIcon,
} from "lucide-react"

import { MobileActionBar } from "@/components/common/mobile-action-bar"
import { PriceEstimate, formatTaka } from "@/components/marketplace/product/PriceEstimate"
import {
  QuantityStepper,
  STEADY_CHANGE,
  type QuantityChange,
} from "@/components/marketplace/product/QuantityStepper"
import { AddToQuoteButton } from "@/components/marketplace/quote-list/AddToQuoteButton"
import { haptic } from "@/lib/celebrate"
import { cn } from "@/lib/utils"
import type { ProductWithSupplier } from "@/services/marketplace.service"

type BuyBoxProps = {
  product: ProductWithSupplier
  serviceMode: boolean
  /** Single-product quote form link (already carries productId/productSlug/supplierSlug). */
  quoteHref: string
  call: string | null
  whatsapp: string | null
}

type Fact = { key: string; icon: LucideIcon; text: string; tone?: string }

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
  const moq = typeof product.moq === "number" && product.moq > 0 ? Math.floor(product.moq) : null
  const minQty = moq ?? 1
  const lead =
    typeof product.leadTimeDays === "number" && product.leadTimeDays > 0 ? product.leadTimeDays : null
  const sellerName = product.supplier?.name ?? (serviceMode ? "the provider" : "the seller")

  const [qty, setQty] = useState<{ value: number; change: QuantityChange }>({
    value: minQty,
    change: STEADY_CHANGE,
  })
  const onQty = useCallback((value: number, change: QuantityChange) => setQty({ value, change }), [])

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
    product.inStock
      ? { key: "stock", icon: CheckCircle2, text: serviceMode ? "Available now" : "In stock", tone: "text-success" }
      : { key: "stock", icon: Clock3, text: serviceMode ? "Schedule needed" : "On order", tone: "text-amber-600" },
  ]
  if (lead) {
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

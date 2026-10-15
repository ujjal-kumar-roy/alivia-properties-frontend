"use client"

import { useRef, ViewTransition } from "react"
import { Package, Wrench } from "lucide-react"

import { MorphLink } from "@/components/common/morph-placeholder"
import { MediaImage } from "@/components/marketplace/MediaImage"
import { productStartingPrice } from "@/components/marketplace/product-meta"
import { AddToQuoteButton } from "@/components/marketplace/quote-list/AddToQuoteButton"
import { ROUTES } from "@/config/routes.config"
import { CARD_BLUR_DATA_URL } from "@/lib/image-placeholder"
import { cn } from "@/lib/utils"
import type { ProductWithSupplier } from "@/services/marketplace.service"
import { isServiceKind } from "@/utils/marketplace-kind"

type ProductRowProps = {
  product: ProductWithSupplier
  /** Name the photo for the row-to-page morph. Turn off when the product can appear twice on a page. */
  morph?: boolean
  className?: string
}

/** Exact taka amount ("৳157,300", "৳11.5"): a list row has room for the real number. */
function taka(amount: number) {
  return `৳${amount.toLocaleString("en-BD", { maximumFractionDigits: 2 })}`
}

function days(count: number) {
  return `${count} ${count === 1 ? "day" : "days"}`
}

/**
 * Dense list row for category results (the "list" layout): 88px photo, name
 * on up to two lines, price per unit (or "Ask for price"), then one quiet line
 * of facts: "MOQ 500 bag · Ships in 1 day · Seller". The row is one link; the
 * add-to-quote button sits beside it, never inside the <a>. On phones the
 * button rides the bottom-right corner so the name keeps the full width; from
 * md the price moves to its own right-aligned column.
 * Rows highlight on press instead of shrinking: a full-width row scaling down
 * reads as the whole list wobbling.
 */
export function ProductRow({ product, morph = true, className }: ProductRowProps) {
  const thumbRef = useRef<HTMLDivElement>(null)
  const service = isServiceKind(product.supplier?.kind)
  const price = productStartingPrice(product)
  const seller = product.supplier?.name?.trim()
  const morphName = `product-${product.slug}`

  const facts: string[] = []
  if (product.inStock === false) facts.push(service ? "Schedule needed" : "On order")
  if (product.moq && product.moq > 1) {
    facts.push(`${service ? "Min." : "MOQ"} ${product.moq} ${product.unit}`)
  }
  if (product.leadTimeDays && product.leadTimeDays > 0) {
    facts.push(`${service ? "Starts in" : "Ships in"} ${days(product.leadTimeDays)}`)
  }
  if (seller) facts.push(seller)

  const Fallback = service ? Wrench : Package
  const image = (
    <MediaImage
      src={product.image}
      alt=""
      fill
      unoptimized
      sizes="88px"
      placeholder="blur"
      blurDataURL={CARD_BLUR_DATA_URL}
      className="object-cover"
      fallback={
        <span className="flex size-full items-center justify-center text-ink-300">
          <Fallback aria-hidden="true" className="size-7" />
        </span>
      }
    />
  )

  return (
    <article className={cn("relative py-1", className)}>
      <MorphLink
        href={ROUTES.MARKETPLACE_PRODUCT(product.slug)}
        morph={morph ? morphName : undefined}
        className="flex gap-3 rounded-xl p-2 outline-none transition-[background-color] duration-140 ease-(--ease-out) [-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-400 active:bg-ink-100/70 md:items-center md:pr-16 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-ink-50"
      >
        <div
          ref={thumbRef}
          className="relative size-22 shrink-0 overflow-hidden rounded-lg bg-ink-50"
        >
          {morph ? (
            <ViewTransition name={morphName} share="auto" default="none">
              {image}
            </ViewTransition>
          ) : (
            image
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-x-6">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-ink-900 md:col-start-1 md:row-start-1 md:text-[0.9375rem]">
            {product.name}
          </h3>

          {/* pr-12 keeps the price and facts clear of the corner add button on phones. */}
          <p className="mt-1.5 truncate pr-12 leading-tight md:col-start-2 md:row-span-2 md:row-start-1 md:mt-0 md:pr-0 md:text-right">
            {price ? (
              <>
                <span className="text-base font-extrabold tabular-nums text-ink-900 md:text-lg">
                  {taka(price)}
                </span>
                <span className="ml-1 text-xs font-medium text-ink-500">/ {product.unit}</span>
              </>
            ) : (
              <span className="text-sm font-bold text-brand-700">Ask for price</span>
            )}
          </p>

          {facts.length > 0 ? (
            <p className="mt-1 truncate pr-12 text-xs text-ink-500 md:col-start-1 md:row-start-2 md:pr-0">
              {facts.join(" · ")}
            </p>
          ) : null}
        </div>
      </MorphLink>

      <div className="absolute bottom-3 right-2 md:bottom-auto md:top-1/2 md:-translate-y-1/2">
        <AddToQuoteButton
          variant="icon"
          flyFrom={thumbRef}
          item={{
            productId: product.id,
            slug: product.slug,
            name: product.name,
            image: product.image,
            price: product.price,
            unit: product.unit,
            moq: product.moq ?? undefined,
            supplierId: product.supplier?.id ?? product.supplierId,
            supplierSlug: product.supplier?.slug,
            supplierName: seller,
          }}
        />
      </div>
    </article>
  )
}

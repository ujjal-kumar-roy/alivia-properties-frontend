import { ViewTransition } from "react"
import Link from "next/link"
import { Boxes, CheckCircle2, Clock3, Package, Store, Truck, Wrench } from "lucide-react"

import { CardFact } from "@/components/common/card-fact"
import { GoldStar } from "@/components/marketplace/card-icons"
import { MediaImage } from "@/components/marketplace/MediaImage"
import {
  activeVariantCount,
  productStartingPrice,
  visibleRating,
} from "@/components/marketplace/product-meta"
import { ROUTES } from "@/config/routes.config"
import { CARD_BLUR_DATA_URL } from "@/lib/image-placeholder"
import { cn } from "@/lib/utils"
import type { MarketplaceProduct, SupplierKind } from "@/types/marketplace.types"
import { formatPrice } from "@/utils/format-price"
import { isServiceKind } from "@/utils/marketplace-kind"

type ProductCardProps = {
  product: MarketplaceProduct & { supplier?: { name: string; kind?: SupplierKind } }
  /** Overrides the supplier on the product (the supplier page passes its own). */
  supplierName?: string
  /** Treat the product as a service (min booking, visit lead) when the supplier is one. */
  serviceMode?: boolean
  /** Hide the "sold by" line when every card in the list has the same seller. */
  hideSupplier?: boolean
  /** Name the photo for the card-to-page morph. Turn off when the same product can appear twice on a page. */
  morph?: boolean
  className?: string
}

/**
 * Marketplace product tile. Phones: a 4:3 photo with the name and one line of
 * short info floating on it in a glass caption, then price, rating, seller and
 * two quick facts underneath (about 190px tall, so a 2 column grid fits six per
 * screen). From `sm` the caption becomes an ordinary block below the photo.
 * Real fields only: price falls back to "Quote on request" (the catalogue
 * stores 0 for quote-only items).
 */
export function MarketplaceProductCard({
  product,
  supplierName,
  serviceMode,
  hideSupplier = false,
  morph = true,
  className,
}: ProductCardProps) {
  const service = serviceMode ?? isServiceKind(product.supplier?.kind)
  const seller = supplierName ?? product.supplier?.name
  const price = productStartingPrice(product)
  const rating = visibleRating(product.rating)
  const options = activeVariantCount(product)
  const shortInfo =
    product.shortDescription?.trim() ||
    [
      product.brand,
      options > 0 ? `${options} ${service ? "package" : "option"}${options === 1 ? "" : "s"}` : null,
    ]
      .filter(Boolean)
      .join(" · ")

  const facts: { key: string; icon: typeof Boxes; text: string }[] = []
  if (product.moq && product.moq > 0) {
    facts.push({
      key: "moq",
      icon: Boxes,
      text: `${service ? "Min" : "MOQ"} ${product.moq} ${product.unit}`,
    })
  }
  if (product.leadTimeDays && product.leadTimeDays > 0) {
    facts.push({
      key: "lead",
      icon: Truck,
      text: `${product.leadTimeDays}d ${service ? "visit" : "lead"}`,
    })
  }
  facts.push(
    product.inStock
      ? { key: "stock", icon: CheckCircle2, text: service ? "Available" : "In stock" }
      : { key: "stock", icon: Clock3, text: service ? "Schedule needed" : "On order" },
  )

  const Fallback = service ? Wrench : Package

  const image = (
    <MediaImage
      src={product.image}
      alt={product.name}
      fill
      unoptimized
      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
      placeholder="blur"
      blurDataURL={CARD_BLUR_DATA_URL}
      className="object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      fallback={
        <div className="flex size-full items-start justify-center bg-linear-to-br from-brand-50 to-brand-100 pt-7 text-brand-300 sm:items-center sm:pt-0">
          <Fallback aria-hidden="true" className="size-8 sm:size-12" />
        </div>
      }
    />
  )

  return (
    <article
      data-card
      className={cn(
        "group relative min-w-0 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-(--shadow-card) transition-[translate,scale,box-shadow] duration-200 active:scale-[0.98] sm:rounded-3xl sm:hover:-translate-y-1 sm:hover:shadow-(--shadow-elevated) motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100",
        className,
      )}
    >
      <Link
        href={ROUTES.MARKETPLACE_PRODUCT(product.slug)}
        className="block rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-400"
      >
        {/* Phones: this wrapper is the photo box the caption floats in.
            From sm it disappears (contents) so the caption flows below the photo. */}
        <div className="relative sm:contents">
          <div className="relative aspect-4/3 overflow-hidden bg-brand-50">
            {morph ? (
              <ViewTransition name={`product-${product.slug}`}>{image}</ViewTransition>
            ) : (
              image
            )}
            {product.badge ? (
              <span className="absolute left-1.5 top-1.5 inline-flex rounded-full bg-gold-400 px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wide text-brand-950 shadow-sm sm:left-3 sm:top-3 sm:px-2.5 sm:py-1">
                {product.badge}
              </span>
            ) : null}
          </div>

          <div className="glass-caption sm:px-3 sm:pt-3">
            <h3 className="line-clamp-2 font-sans text-[0.8125rem] font-extrabold leading-snug text-ink-900 transition-colors group-hover:text-brand-800 sm:text-base">
              {product.name}
            </h3>
            {shortInfo ? (
              <p className="mt-px line-clamp-1 text-xs font-medium leading-snug text-ink-600 sm:mt-1 sm:line-clamp-2">
                {shortInfo}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-1 px-2.5 pb-2.5 pt-2 sm:px-3 sm:pb-3 sm:pt-2.5">
          {price ? (
            <p className="truncate text-[0.95rem] font-extrabold leading-tight tabular-nums text-gold-700">
              {formatPrice(price, true)}
              <span className="ml-0.5 text-xs font-semibold text-ink-500">
                / {product.unit}
              </span>
            </p>
          ) : (
            <p className="truncate text-[0.8125rem] font-extrabold leading-tight text-gold-700">
              Quote on request
            </p>
          )}

          {(!hideSupplier && seller) || rating ? (
            <div className="flex items-center justify-between gap-2">
              {!hideSupplier && seller ? (
                <CardFact icon={Store} className="min-w-0">
                  <span className="truncate">{seller}</span>
                </CardFact>
              ) : (
                <span />
              )}
              {rating ? (
                <CardFact icon={GoldStar} className="shrink-0">
                  {rating.toFixed(1)}
                  {product.reviewCount ? (
                    <span className="hidden font-normal text-ink-500 sm:inline">
                      ({product.reviewCount})
                    </span>
                  ) : null}
                </CardFact>
              ) : null}
            </div>
          ) : null}

          <ul className="flex flex-wrap gap-x-2.5 gap-y-0.5">
            {facts.slice(0, 2).map((fact) => (
              <li key={fact.key}>
                <CardFact icon={fact.icon}>{fact.text}</CardFact>
              </li>
            ))}
            {facts[2] ? (
              <li className="hidden sm:block">
                <CardFact icon={facts[2].icon}>{facts[2].text}</CardFact>
              </li>
            ) : null}
          </ul>
        </div>
      </Link>
    </article>
  )
}

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
import type { MarketplaceProduct, SupplierKind } from "@/types/marketplace.types"
import { formatTaka } from "@/utils/format-price"
import { isServiceKind } from "@/utils/marketplace-kind"

type ProductCardProps = {
  product: MarketplaceProduct & {
    supplier?: { id?: string; slug?: string; name: string; kind?: SupplierKind }
  }
  /** Name the photo for the card-to-page morph. Turn off when the same product can appear twice on a page. */
  morph?: boolean
  className?: string
  /** Overrides the supplier on the product (the supplier page passes its own). */
  supplierName?: string
  /** Treat the product as a service (min booking, visit lead) when the supplier is one. */
  serviceMode?: boolean
  /** Leave the seller out of the byline when every card in the list has the same seller. */
  hideSupplier?: boolean
}

function days(count: number) {
  return `${count} ${count === 1 ? "day" : "days"}`
}

/**
 * Grid tile for the marketplace: a square photo, then name (2 lines), "brand ·
 * seller", the exact price per unit, and quiet facts ("MOQ 500 bag · Ships in 1
 * day"). Real fields only: price 0 reads "Ask for price"; no badge, rating or
 * caption on the photo.
 *
 * The whole card opens the product, but it is a stretched link on the name (its
 * ::after covers the card), not an <a> around everything: the round add-to-quote
 * button floats over the photo's corner as a sibling, never nested inside the
 * link, and screen readers hear one link named after the product. The link is a
 * MorphLink: the product page has no loading skeleton today (the card morphs
 * straight into the hero), but a tap still records its photo (the card's largest
 * loaded <img>, see src/lib/morph-handoff.ts) for one if it ever gets one.
 *
 * Press: the card squeezes while the link is held down, not while the add button
 * is. Hover (mouse and trackpad only): the photo zooms to 1.03 and the shadow lifts.
 */
export function MarketplaceProductCard({
  product,
  morph = true,
  className,
  supplierName,
  serviceMode,
  hideSupplier = false,
}: ProductCardProps) {
  const photoRef = useRef<HTMLDivElement>(null)
  const service = serviceMode ?? isServiceKind(product.supplier?.kind)
  const seller = (supplierName ?? product.supplier?.name)?.trim()
  const brand = product.brand?.trim()
  const unit = product.unit?.trim()
  const price = productStartingPrice(product)
  const morphName = `product-${product.slug}`

  // "brand · seller": skip a seller that only repeats the brand.
  const byline = [
    brand,
    !hideSupplier && seller && seller.toLowerCase() !== brand?.toLowerCase() ? seller : null,
  ]
    .filter(Boolean)
    .join(" · ")

  const facts: string[] = []
  if (product.inStock === false) facts.push(service ? "Schedule needed" : "On order")
  if (product.moq && product.moq > 1) {
    facts.push(`${service ? "Min." : "MOQ"} ${product.moq} ${unit ?? ""}`.trim())
  }
  if (product.leadTimeDays && product.leadTimeDays > 0) {
    facts.push(`${service ? "Starts in" : "Ships in"} ${days(product.leadTimeDays)}`)
  }

  const Fallback = service ? Wrench : Package
  const image = (
    <MediaImage
      src={product.image}
      alt=""
      fill
      unoptimized
      sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
      placeholder="blur"
      blurDataURL={CARD_BLUR_DATA_URL}
      className="object-cover transition-[scale] duration-300 ease-(--ease-out) motion-safe:[@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-[1.03]"
      fallback={
        <div className="flex size-full items-center justify-center text-ink-300">
          <Fallback aria-hidden="true" className="size-10" />
        </div>
      }
    />
  )

  return (
    <article
      data-card
      className={cn(
        "group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-(--shadow-card)",
        "transition-[scale,box-shadow] duration-140 ease-(--ease-out)",
        // Squeeze only while the card's link is pressed (the add button has its own press).
        "motion-safe:has-[a:active]:scale-[0.98]",
        "[@media(hover:hover)_and_(pointer:fine)]:hover:shadow-(--shadow-elevated)",
        className,
      )}
    >
      {/* The photo box is also what flies to the quote list when the button is tapped. */}
      <div ref={photoRef} className="relative aspect-square shrink-0 overflow-hidden bg-ink-50">
        {morph ? (
          <ViewTransition name={morphName} share="auto" default="none">
            {image}
          </ViewTransition>
        ) : (
          image
        )}
        <div className="absolute bottom-2 right-2 z-10">
          <AddToQuoteButton
            variant="icon"
            flyFrom={photoRef}
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
      </div>

      <div className="@container flex flex-1 flex-col p-2.5 sm:p-3">
        <h3 className="line-clamp-2 font-sans text-sm font-semibold leading-snug text-ink-900">
          <MorphLink
            href={ROUTES.MARKETPLACE_PRODUCT(product.slug)}
            morph={morph ? morphName : undefined}
            className="rounded-2xl outline-none [-webkit-tap-highlight-color:transparent] after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-brand-400"
          >
            {product.name}
          </MorphLink>
        </h3>
        {byline ? <p className="mt-0.5 truncate text-xs text-ink-600">{byline}</p> : null}

        {/* Pinned to the bottom so prices line up across a row of cards. */}
        <div className="mt-auto pt-2">
          <p className="flex flex-wrap items-baseline gap-x-1 leading-7">
            {price ? (
              <>
                <span className="text-lg font-extrabold tabular-nums text-ink-900">
                  {formatTaka(price)}
                </span>
                {unit ? <span className="text-xs font-medium text-ink-500">/ {unit}</span> : null}
              </>
            ) : (
              <span className="text-base font-bold text-brand-700">Ask for price</span>
            )}
          </p>
          {/* One fact per line while the card is narrow (a 2-up phone grid, a rail), so
              a wrapped line never ends on a dangling "·"; dotted on one line when it fits. */}
          {facts.length > 0 ? (
            <ul className="flex flex-col text-xs leading-snug text-ink-500 @[12.5rem]:flex-row @[12.5rem]:flex-wrap">
              {facts.map((fact) => (
                <li
                  key={fact}
                  className="@[12.5rem]:not-last:after:mx-1.5 @[12.5rem]:not-last:after:content-['·']"
                >
                  {fact}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </article>
  )
}

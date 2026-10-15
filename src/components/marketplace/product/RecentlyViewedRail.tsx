"use client"

import { Package } from "lucide-react"
import Link from "next/link"

import { MediaImage } from "@/components/marketplace/MediaImage"
import { ROUTES } from "@/config/routes.config"
import { useRecentProducts } from "@/hooks/use-recent-products"
import { CARD_BLUR_DATA_URL } from "@/lib/image-placeholder"
import { MAX_RECENT_PRODUCTS, type RecentProduct } from "@/lib/recent-products"
import { formatPrice } from "@/utils/format-price"

import { RailScroller } from "./RailScroller"

/**
 * Products the visitor looked at before, from this device only. Renders nothing
 * until there are at least two besides the current one (one lone card is not a
 * rail), and nothing on the server: the list lives in localStorage.
 *
 * Cards are a lean snapshot card, not MarketplaceProductCard: the snapshot has
 * no product id, so a quick-add button there would put the wrong id in the
 * quote list, and its stock/MOQ would be stale. No photo morph either (the
 * same product may already be named elsewhere on the page).
 */
export function RecentlyViewedRail({ excludeSlug }: { excludeSlug: string }) {
  const { items } = useRecentProducts()
  const visible = items.filter((item) => item.slug !== excludeSlug).slice(0, MAX_RECENT_PRODUCTS)

  if (visible.length < 2) return null

  return (
    <RailScroller
      title="Recently viewed"
      // Appears after hydration, so fade it in rather than pop (opacity stays under reduced motion).
      className="transition-[opacity,translate] duration-200 ease-(--ease-out) starting:translate-y-2 starting:opacity-0 motion-reduce:starting:translate-y-0"
    >
      {visible.map((item) => (
        <li key={item.slug} className="flex w-40 shrink-0 snap-start md:w-55">
          <RecentCard item={item} />
        </li>
      ))}
    </RailScroller>
  )
}

function RecentCard({ item }: { item: RecentProduct }) {
  return (
    <article className="group relative w-full min-w-0 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-(--shadow-card) transition-[translate,scale,box-shadow] duration-140 ease-(--ease-out) active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 [@media(hover:hover)_and_(pointer:fine)]:hover:shadow-(--shadow-elevated)">
      <Link
        href={ROUTES.MARKETPLACE_PRODUCT(item.slug)}
        className="block rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-400"
      >
        <div className="relative aspect-square overflow-hidden bg-ink-50">
          <MediaImage
            src={item.image}
            alt=""
            fill
            sizes="(min-width: 768px) 220px, 160px"
            placeholder="blur"
            blurDataURL={CARD_BLUR_DATA_URL}
            className="object-cover transition-transform duration-300 ease-(--ease-out) motion-reduce:transition-none [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-[1.03]"
            fallback={
              <div className="flex size-full items-center justify-center text-ink-300">
                <Package aria-hidden="true" className="size-10" />
              </div>
            }
          />
        </div>
        <div className="flex flex-col gap-1 px-2.5 pb-3 pt-2.5">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-ink-900">{item.name}</h3>
          {item.supplierName ? (
            <p className="truncate text-xs text-ink-500">{item.supplierName}</p>
          ) : null}
          {item.price > 0 ? (
            <p className="truncate text-base font-extrabold tabular-nums text-ink-900">
              {formatPrice(item.price, true)}
              {item.unit ? <span className="ml-1 text-xs font-medium text-ink-500">/ {item.unit}</span> : null}
            </p>
          ) : (
            <p className="text-sm font-bold text-brand-700">Ask for price</p>
          )}
        </div>
      </Link>
    </article>
  )
}

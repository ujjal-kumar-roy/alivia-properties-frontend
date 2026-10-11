import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

import { MediaImage } from "@/components/marketplace/MediaImage"
import { ROUTES } from "@/config/routes.config"
import { CARD_BLUR_DATA_URL } from "@/lib/image-placeholder"
import { cn } from "@/lib/utils"
import type { MarketplaceCategory } from "@/services/marketplace.service"

type CategoryImageCardProps = {
  cat: MarketplaceCategory
  /** Live product count; falls back to the count carried on the category. */
  count?: number
  /** Marks the category the visitor is already on. */
  current?: boolean
  className?: string
}

/**
 * Category tile for 2 column grids. Phones: a 4:3 photo with the name and the
 * product count floating on it in a glass caption; from `sm` the caption
 * becomes an ordinary block below the photo.
 */
export function CategoryImageCard({ cat, count, current, className }: CategoryImageCardProps) {
  // Categories store their tile picture in `image.url`; departments use `iconUrl`.
  // Prefer the richer `image` ref so admin edits to category tiles show up here,
  // then fall back to `iconUrl`.
  const imageSrc = cat.image?.url ?? cat.iconUrl ?? undefined
  const productCount = count ?? cat.productCount ?? 0
  const info =
    productCount > 0
      ? `${productCount} ${productCount === 1 ? "product" : "products"}`
      : cat.description || "Browse category"

  return (
    <Link
      href={ROUTES.MARKETPLACE_CATEGORY(cat.slug)}
      aria-label={`Browse ${cat.name}`}
      aria-current={current ? "page" : undefined}
      data-card
      className={cn(
        "group relative block overflow-hidden rounded-2xl border border-white/70 bg-ink-100 shadow-sm transition-[translate,scale,box-shadow] duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 sm:flex sm:flex-col sm:border-border/70 sm:bg-white sm:hover:-translate-y-1 sm:hover:border-brand-200 sm:hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100",
        current && "ring-2 ring-brand-500",
        className,
      )}
    >
      <div className="relative aspect-4/3 overflow-hidden bg-ink-100">
        <MediaImage
          src={imageSrc}
          alt=""
          fill
          unoptimized
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
          placeholder="blur"
          blurDataURL={CARD_BLUR_DATA_URL}
          className="object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          fallback={
            <div className="flex size-full items-center justify-center bg-linear-to-br from-brand-100 to-brand-200">
              <span className="select-none font-heading text-4xl font-bold text-brand-600 opacity-40">
                {cat.name.charAt(0)}
              </span>
            </div>
          }
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-linear-to-t from-brand-950/35 via-transparent to-transparent sm:from-black/40"
        />
      </div>

      <div className="glass-caption sm:flex sm:flex-1 sm:flex-col sm:px-3 sm:pb-3 sm:pt-3">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 text-[0.8125rem] font-extrabold leading-snug text-ink-900 group-hover:text-brand-800 sm:text-sm">
            {cat.name}
          </p>
          <ArrowUpRight
            aria-hidden="true"
            className="mt-0.5 hidden size-4 shrink-0 text-ink-400 transition-colors group-hover:text-brand-600 sm:block"
          />
        </div>
        <p className="mt-0.5 line-clamp-1 text-xs font-medium text-ink-600 sm:mt-1 sm:line-clamp-2">
          {info}
        </p>
      </div>
    </Link>
  )
}

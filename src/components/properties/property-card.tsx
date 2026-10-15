import { ViewTransition } from "react"
import Image from "next/image"
import { ArrowUpRight, Eye, House, MapPin, ShieldCheck, Star } from "lucide-react"
import { CardFact } from "@/components/common/card-fact"
import { MorphLink } from "@/components/common/morph-placeholder"
import { VerifiedBadge } from "@/components/common/verified-badge"
import { SaveButton } from "@/components/properties/save-button"
import { CompareButton } from "@/components/properties/compare-button"
import {
  getPropertyFacts,
  getPropertyPrice,
  isNewListing,
  listedAgo,
  sellerLabel,
} from "@/components/properties/property-facts"
import { ROUTES } from "@/config/routes.config"
import { CARD_BLUR_DATA_URL } from "@/lib/image-placeholder"
import { cn } from "@/lib/utils"
import type { Property } from "@/types/property.types"

interface PropertyCardProps {
  property: Property
  layout?: "grid" | "list"
  /** Load the photo right away (first cards on a listing page). */
  eager?: boolean
  /**
   * Name the photo for the shared-element morph into the detail hero. A name must be
   * unique on a page, so pass `false` where the same listing can appear twice
   * (e.g. the similar-properties rail on its own detail page).
   */
  morphName?: boolean
}

// The card icon buttons keep the glass look (tint, rim, highlight) but skip the
// backdrop blur: a listing page has up to 24 of them, and a 36px button over a
// photo gains nothing from a blur layer of its own.
const CARD_ICON_BUTTON =
  "size-8 min-h-8 min-w-8 sm:size-9 sm:min-h-9 sm:min-w-9 [-webkit-backdrop-filter:none] [backdrop-filter:none] bg-white/85"

/**
 * One listing. Phones get the compact row (square thumbnail left, facts right,
 * about 140px tall); from `sm` it is a vertical card, or a wide row when
 * `layout="list"`.
 *
 * The whole card is one link. Save and Compare are siblings of that link,
 * positioned over the thumbnail corner, so no button ever sits inside the anchor.
 */
export function PropertyCard({ property: p, layout = "grid", eager = false, morphName = true }: PropertyCardProps) {
  const isRent = p.purpose === "rent"
  const isList = layout === "list"
  const href = ROUTES.PROPERTY_DETAIL(p.slug)
  const price = getPropertyPrice(p)
  const facts = getPropertyFacts(p)
  const facilities = p.facilities ?? []
  const cover = p.images[0]
  const ago = listedAgo(p.createdAt)
  const fresh = isNewListing(p.createdAt)
  const seller = sellerLabel(p)
  const views = p.viewCount ?? 0
  const hasBadge = Boolean(p.isFeatured || p.isVerified)
  const morph = cover && morphName ? `property-${p.slug}` : undefined

  const photo = cover ? (
    <Image
      src={cover}
      alt=""
      fill
      sizes={
        isList
          ? "(min-width: 768px) 320px, (min-width: 640px) 208px, 100px"
          : "(min-width: 1280px) 22vw, (min-width: 1024px) 30vw, (min-width: 640px) 46vw, 100px"
      }
      loading={eager ? "eager" : undefined}
      placeholder="blur"
      blurDataURL={CARD_BLUR_DATA_URL}
      className="object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
    />
  ) : null

  return (
    <article
      data-card
      className={cn(
        "group relative min-w-0 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-(--shadow-card) transition-[translate,scale,box-shadow] duration-200",
        "has-[a:active]:scale-[0.98] sm:rounded-3xl sm:hover:-translate-y-1 sm:hover:shadow-(--shadow-elevated)",
        "motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:has-[a:active]:scale-100",
      )}
    >
      <MorphLink
        href={href}
        morph={morph}
        className={cn(
          "flex gap-2.5 rounded-[inherit] p-2 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-400 sm:p-0",
          isList ? "sm:grid sm:grid-cols-[13rem_1fr] sm:gap-0 md:grid-cols-[20rem_1fr]" : "sm:block",
        )}
      >
        {/* Media: square thumbnail on phones, 16:10 image from sm (full height in list layout). */}
        <div
          className={cn(
            "relative aspect-square w-25 shrink-0 self-start overflow-hidden rounded-xl bg-ink-100",
            isList
              ? "sm:aspect-auto sm:min-h-52 sm:w-full sm:self-auto sm:rounded-none"
              : "sm:aspect-16/10 sm:w-full sm:self-auto sm:rounded-none",
          )}
        >
          {cover ? (
            morph ? (
              <ViewTransition name={morph} share="auto" default="none">
                {photo}
              </ViewTransition>
            ) : (
              photo
            )
          ) : (
            <div className="flex h-full w-full items-center justify-center text-brand-200">
              <House aria-hidden="true" className="size-8 sm:size-10" />
            </div>
          )}

          {/* Top-left: sale or rent, plus (from sm) the trust badges. */}
          <div className="absolute left-1.5 top-1.5 flex flex-col items-start gap-1.5 sm:left-3 sm:top-3">
            <span
              className={cn(
                "inline-flex rounded-full px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wide shadow-sm sm:px-2.5 sm:py-1 sm:text-xs",
                isRent ? "bg-gold-400 text-brand-950" : "bg-brand-700 text-white",
              )}
            >
              <span className="sm:hidden">{isRent ? "Rent" : "Sale"}</span>
              <span className="hidden sm:inline">{isRent ? "For rent" : "For sale"}</span>
            </span>
            {p.isFeatured && (
              <VerifiedBadge type="featured" className="hidden shadow-sm sm:inline-flex" />
            )}
            {p.isVerified && (
              <VerifiedBadge type="verified" className="hidden shadow-sm sm:inline-flex" />
            )}
          </div>

          {/* Top-right on phones: the same trust badges as icon-only dots. */}
          {hasBadge && (
            <div className="absolute right-1.5 top-1.5 flex flex-col gap-1 sm:hidden">
              {p.isFeatured && (
                <span className="grid size-5 place-items-center rounded-full bg-gold-400 text-brand-950 shadow-sm">
                  <Star aria-hidden="true" className="size-3 fill-current" />
                  <span className="sr-only">Featured listing</span>
                </span>
              )}
              {p.isVerified && (
                <span className="grid size-5 place-items-center rounded-full bg-white/95 text-brand-700 shadow-sm">
                  <ShieldCheck aria-hidden="true" className="size-3.5" />
                  <span className="sr-only">Verified listing</span>
                </span>
              )}
            </div>
          )}
        </div>

        <div className={cn("flex min-w-0 flex-1 flex-col", isList ? "sm:p-5" : "sm:p-4")}>
          <h3 className="line-clamp-1 font-heading text-[0.95rem] font-semibold leading-tight text-ink-900 transition-colors group-hover:text-brand-700 sm:line-clamp-2 sm:text-lg">
            {p.title}
          </h3>

          <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-500 sm:mt-1.5 sm:text-sm">
            <MapPin aria-hidden="true" className="size-3 shrink-0 text-brand-600 sm:size-4" />
            <span className="truncate">
              {p.area}, {p.district}
            </span>
          </p>

          {/* Two rows on phones: anything that does not fit is clipped, never wrapped to a third. */}
          {facts.length > 0 && (
            <ul className="mt-1 flex max-h-[2.2rem] flex-wrap gap-x-2.5 gap-y-0.5 overflow-hidden sm:mt-3 sm:max-h-none sm:gap-x-3 sm:gap-y-1.5 sm:overflow-visible">
              {facts.map((f) => (
                <li key={f.key} className={cn("flex", f.phoneHidden && "max-sm:hidden")}>
                  <CardFact icon={f.icon}>{f.label}</CardFact>
                </li>
              ))}
            </ul>
          )}

          {/* Tablet and up: the description in the wide layout, and amenities. */}
          {isList && p.description && (
            <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-ink-500 max-sm:hidden">
              {p.description}
            </p>
          )}
          {facilities.length > 0 && (
            <ul className="mt-3 hidden flex-wrap gap-1.5 sm:flex">
              {facilities.slice(0, 3).map((f) => (
                <li
                  key={f}
                  className="rounded-full bg-brand-50 px-2.5 py-1 text-[0.7rem] font-semibold text-brand-800"
                >
                  {f}
                </li>
              ))}
              {facilities.length > 3 && (
                <li className="rounded-full bg-ink-100 px-2.5 py-1 text-[0.7rem] font-semibold text-ink-600">
                  +{facilities.length - 3}
                </li>
              )}
            </ul>
          )}

          <div className="mt-auto pt-1 sm:pt-3">
            <div className="flex items-end justify-between gap-2 sm:items-center sm:border-t sm:border-border/60 sm:pt-3">
              <p className="min-w-0 truncate leading-tight tabular-nums">
                <span className="text-[1.05rem] font-extrabold text-gold-700 sm:text-xl">
                  {price.amount}
                </span>
                {price.per && (
                  <span className="ml-0.5 text-xs font-semibold text-ink-500">{price.per}</span>
                )}
              </p>
              <div className="flex shrink-0 items-center gap-2">
                {p.priceNegotiable && (
                  <span className="rounded-full bg-gold-100 px-2 py-0.5 text-[0.6875rem] font-bold leading-4 text-gold-800">
                    Negotiable
                  </span>
                )}
                <span className="hidden size-8 items-center justify-center rounded-full bg-brand-50 text-brand-700 transition-colors group-hover:bg-brand-700 group-hover:text-white sm:flex">
                  <ArrowUpRight aria-hidden="true" className="size-4" />
                </span>
              </div>
            </div>

            {(seller || views > 0 || ago) && (
              <div className="mt-0.5 flex min-w-0 items-center gap-2 text-xs text-ink-500 sm:mt-2.5">
                <span className="flex min-w-0 flex-1 items-center gap-1">
                  {p.sellerVerified && (
                    <ShieldCheck
                      role="img"
                      aria-label="Verified seller"
                      className="size-3.5 shrink-0 text-brand-600"
                    />
                  )}
                  {p.sellerAvatar && (
                    <Image
                      src={p.sellerAvatar}
                      alt=""
                      width={24}
                      height={24}
                      className="hidden size-6 rounded-full object-cover sm:block"
                    />
                  )}
                  {seller && <span className="truncate">{seller}</span>}
                </span>
                {views > 0 && (
                  <span className="inline-flex shrink-0 items-center gap-1">
                    <Eye aria-hidden="true" className="size-3.5" />
                    {views.toLocaleString("en-BD")}
                  </span>
                )}
                {ago && (
                  <span className={cn("shrink-0", fresh && "font-semibold text-brand-700")}>
                    {fresh ? `New ${ago.toLowerCase()}` : ago}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </MorphLink>

      {/* Save and Compare sit over the thumbnail but outside the link. Bottom corners
          of the thumbnail on phones, a column at the image's top-right from sm. */}
      <div
        className={cn(
          "pointer-events-none absolute left-3 top-16 z-10 flex w-[5.75rem] justify-between *:pointer-events-auto",
          "sm:top-3 sm:w-auto sm:flex-col sm:gap-2",
          isList ? "sm:left-[10rem] md:left-[17rem]" : "sm:left-auto sm:right-3",
        )}
      >
        <SaveButton propertyId={p.id} variant="glass" className={CARD_ICON_BUTTON} />
        <CompareButton property={p} variant="glass" className={CARD_ICON_BUTTON} />
      </div>
    </article>
  )
}

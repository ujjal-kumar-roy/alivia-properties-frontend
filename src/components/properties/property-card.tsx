import Link from "next/link"
import Image from "next/image"
import { MapPin, BedDouble, Bath, Maximize2, Eye } from "lucide-react"
import { VerifiedBadge } from "@/components/common/verified-badge"
import { formatPrice, formatRent } from "@/utils/format-price"
import { ROUTES } from "@/config/routes.config"
import { SaveButton } from "@/components/properties/save-button"
import { CompareButton } from "@/components/properties/compare-button"
import type { Property } from "@/types/property.types"

interface PropertyCardProps {
  property: Property
  layout?: "grid" | "list"
}

export function PropertyCard({ property, layout = "grid" }: PropertyCardProps) {
  const displayPrice =
    property.purpose === "rent"
      ? formatRent(property.price)
      : formatPrice(property.price, true)

  return (
    <article
      className={`group pressable-lift overflow-hidden rounded-xl border-2 border-t-4 bg-white hover:border-brand-300 hover:shadow-(--shadow-elevated) ${
        property.purpose === "rent"
          ? "border-ink-900/10 border-t-gold-400"
          : "border-ink-900/10 border-t-brand-700"
      } ${
        layout === "list"
          ? "md:grid md:grid-cols-[20rem_1fr] md:border-t-2 md:border-l-4 " +
            (property.purpose === "rent" ? "md:border-l-gold-400" : "md:border-l-brand-700")
          : ""
      }`}
    >
      <div className="relative">
        <Link
          href={ROUTES.PROPERTY_DETAIL(property.slug)}
          className={`relative block overflow-hidden bg-muted ${layout === "list" ? "h-64 md:h-full" : "h-60"}`}
        >
          {property.images[0] ? (
            <>
              <Image
                src={property.images[0]}
                alt={property.title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover motion-safe:transition-transform motion-safe:duration-500 group-hover:scale-105 motion-reduce:group-hover:scale-100"
              />
              <div className="absolute inset-0 bg-linear-to-t from-ink-950 via-ink-950/10 to-transparent" />
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">No image</div>
          )}

          <div className="absolute left-3 top-3 flex gap-1.5">
            {property.isFeatured && (
              <VerifiedBadge type="featured" className="rounded-md border-2 shadow-sm" />
            )}
            {property.isVerified && !property.isFeatured && (
              <VerifiedBadge type="verified" className="rounded-md border-2 shadow-sm" />
            )}
          </div>

          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4">
            <div className="max-w-[70%] text-white">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/70">
                {property.purpose === "rent" ? "For rent" : "For sale"}
              </p>
              <p className="mt-1 text-xl font-semibold tracking-tight text-white">{displayPrice}</p>
              {property.priceNegotiable && (
                <p className="mt-1 text-xs text-white/70">Negotiable</p>
              )}
            </div>
            <div className={`rounded-md border-2 px-3 py-1 text-xs font-bold uppercase tracking-wide shadow-sm ${
              property.purpose === "rent"
                ? "border-blue-700 bg-blue-50 text-blue-700"
                : "border-emerald-700 bg-emerald-50 text-emerald-700"
            }`}>
              {property.purpose === "rent" ? "Rent" : "Sale"}
            </div>
          </div>
        </Link>

        <div className="absolute right-3 top-3 z-10 flex flex-col gap-2">
          <SaveButton propertyId={property.id} className="h-9 w-9 rounded-md border-2 border-white shadow-sm" />
          <CompareButton property={property} className="h-9 w-9 rounded-md border-2 border-white shadow-sm" />
        </div>
      </div>

      <div className={`p-5 ${layout === "list" ? "flex flex-col justify-between gap-5 md:p-6" : "space-y-4"}`}>
        <div className={layout === "list" ? "space-y-5" : "space-y-4"}>
          <div className="space-y-2">
            <Link
              href={ROUTES.PROPERTY_DETAIL(property.slug)}
              className="inline-flex min-h-11 items-center"
            >
              <h3 className={`text-lg font-semibold leading-snug text-ink-900 transition-colors hover:text-brand-800 ${layout === "list" ? "line-clamp-2 md:text-xl" : "line-clamp-2"}`}>
                {property.title}
              </h3>
            </Link>
            <div className="flex items-center gap-2 text-sm text-ink-500">
              <MapPin className="h-4 w-4 shrink-0 text-brand-600" />
              <span className="truncate">{property.area}, {property.district}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-ink-600">
            {property.bedrooms !== undefined && (
              <span className="inline-flex items-center gap-1 rounded-md border border-ink-100 bg-ink-50 px-3 py-1.5">
                <BedDouble className="h-3.5 w-3.5 text-brand-600" />
                {property.bedrooms} Bed
              </span>
            )}
            {property.bathrooms !== undefined && (
              <span className="inline-flex items-center gap-1 rounded-md border border-ink-100 bg-ink-50 px-3 py-1.5">
                <Bath className="h-3.5 w-3.5 text-brand-600" />
                {property.bathrooms} Bath
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-md border border-ink-100 bg-ink-50 px-3 py-1.5">
              <Maximize2 className="h-3.5 w-3.5 text-brand-600" />
              {property.size} {property.sizeUnit}
            </span>
            {layout === "list" && (
              <span className="inline-flex items-center gap-1 rounded-md border border-brand-100 bg-brand-50 px-3 py-1.5 text-brand-800">
                <Eye className="h-3.5 w-3.5" />
                {property.viewCount} views
              </span>
            )}
          </div>

          {layout === "list" && (
            <p className="line-clamp-3 text-sm leading-relaxed text-ink-500">
              {property.description}
            </p>
          )}
        </div>

        <div className={`flex items-center justify-between gap-4 border-t-2 border-ink-100 pt-4 ${layout === "list" ? "md:pt-5" : ""}`}>
          <div className="min-w-0">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-ink-500">Seller</p>
            <div className="mt-2 flex items-center gap-2">
              {property.sellerAvatar && (
                <Image
                  src={property.sellerAvatar}
                  alt={property.sellerName}
                  width={28}
                  height={28}
                  className="rounded-md"
                />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink-800">{property.sellerName}</p>
                <p className="text-xs text-ink-500">{property.sellerVerified ? "Verified seller" : "Independent seller"}</p>
              </div>
            </div>
          </div>

          {layout === "grid" ? (
            <div className="rounded-md border border-brand-100 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-800">
              <span className="inline-flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                {property.viewCount}
              </span>
            </div>
          ) : (
            <Link
              href={ROUTES.PROPERTY_DETAIL(property.slug)}
              className="inline-flex min-h-11 items-center"
            >
              <span className="inline-flex rounded-md bg-ink-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ink-800">
                View Details
              </span>
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}

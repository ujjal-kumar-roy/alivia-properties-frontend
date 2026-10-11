import { numberRange } from "@/components/projects/project-facts"
import type { Project } from "@/types/project.types"
import { formatPrice, formatPriceRange } from "@/utils/format-price"
import { pickLocationText } from "@/utils/project-location"

/**
 * Flat, display-ready shape of a project for listing cards. Lives outside the
 * client card module so server components (the marketplace home) can call the
 * normaliser too.
 */
export type FlagshipProject = {
  slug: string
  name: string
  location: string
  status: string
  /** Display price: a range ("৳96.3 L - ৳1.36 Cr") or a single starting price. */
  price: string | null
  priceIsRange?: boolean
  units: string | null
  cover: string | null
  availableUnits?: number | null
  totalUnits?: number | null
  isFeatured?: boolean
  createdAt?: string
  /** "1-3 Bed", "850-1,250 sq ft": drawn from the project's unit types. */
  bedrooms?: string | null
  size?: string | null
  floors?: number | null
  /** "Feb 2027", or null when unknown. */
  handover?: string | null
  amenities?: string[]
  developer?: string | null
  views?: number | null
}

function formatHandover(iso?: string): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat("en-BD", { month: "short", year: "numeric" }).format(date)
}

/** Normalise a full `Project` into the flat shape the flagship card renders. */
export function toFlagshipProject(p: Project): FlagshipProject {
  const total = p.totalUnits ?? null
  const from = p.priceFrom ?? 0
  const to = p.priceTo ?? 0
  const isRange = from > 0 && to > from
  const units = p.units ?? []
  const beds = numberRange(units.map((u) => u.bedrooms))
  const sizes = numberRange(units.map((u) => u.size))
  const sizeUnit = units.find((u) => u.sizeUnit)?.sizeUnit ?? "sq ft"

  return {
    slug: p.slug ?? "",
    name: p.name ?? "Alivia Apartment",
    // `address` is the human-readable line; `location` is often a pasted map link.
    location: pickLocationText(
      [p.address, p.area, p.division, p.location],
      "Location available on request",
    ),
    status: p.status ?? "ongoing",
    price: isRange ? formatPriceRange(from, to) : from > 0 ? formatPrice(from, true) : null,
    priceIsRange: isRange,
    units: total ? `${total} units` : null,
    cover: p.coverImage ?? p.coverImageUrl ?? p.galleryImages?.[0] ?? null,
    availableUnits: p.availableUnits ?? null,
    totalUnits: total,
    isFeatured: p.isFeatured ?? p.featured ?? false,
    createdAt: p.createdAt,
    bedrooms: beds ? `${beds} Bed` : null,
    size: sizes ? `${sizes} ${sizeUnit}` : null,
    floors: p.totalFloors ?? null,
    handover: formatHandover(p.handoverDate),
    amenities: p.amenities ?? [],
    developer: p.developerName ?? null,
    views: p.viewCount ?? null,
  }
}

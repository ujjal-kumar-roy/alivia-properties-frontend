import type { Project, ProjectUnit } from "@/types/project.types"
import { formatPrice, formatPriceRange } from "@/utils/format-price"
import { toMapEmbedUrl } from "@/utils/map-embed"

/**
 * Pure helpers for the apartment detail page. No React, no "use client", so the
 * server page and the client leaves can both import them.
 */

/** Floor plan as the API sends it (the shared `Project` type does not declare it yet). */
export type ProjectFloorPlan = {
  id?: string
  label?: string
  imageUrl?: string
  size?: number | null
  bedrooms?: number | null
}

type UnitWithPlan = ProjectUnit & { floorPlan?: string | null }
type ProjectWithPlans = Project & { floorPlans?: ProjectFloorPlan[] | null }

export type FloorPlanItem = {
  id: string
  label: string
  imageUrl: string
  /** "2 Bed, 1,515 sqft", or null when the API sent neither. */
  meta: string | null
}

/** Group landmarks by their drive-time bucket, preserving first-seen order. */
export function groupLandmarks(
  landmarks: { name: string; group: string }[],
): { group: string; names: string[] }[] {
  const order: string[] = []
  const buckets = new Map<string, string[]>()
  for (const { name, group } of landmarks) {
    if (!buckets.has(group)) {
      buckets.set(group, [])
      order.push(group)
    }
    buckets.get(group)!.push(name)
  }
  return order.map((group) => ({ group, names: buckets.get(group)! }))
}

// Admins paste the Google Maps share link into "Location" (see project-form.tsx);
// "Full Address" stays plain text. Try Location first (it is where the precise
// pin lives), then fall back to the written address.
export function projectMapEmbedUrl(project: Project): string | null {
  return toMapEmbedUrl(project.location) ?? toMapEmbedUrl(project.address)
}

/** A human-readable location line; never a pasted map link. */
export function projectLocationText(project: Project): string {
  return (
    [project.address, project.location, project.area, project.division].find(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0 && !/^https?:\/\//i.test(value.trim()),
    ) ?? "Apartment location"
  )
}

/** "Feb 2027" (short) or "February 2027" (long); null when missing or unparseable. */
export function formatHandover(iso: string | undefined, style: "short" | "long"): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat("en-BD", { month: style, year: "numeric" }).format(date)
}

/**
 * The price line for a project or unit: a range when two different prices are
 * known, one starting price when only one is, null when neither. Never "0".
 */
export function priceDisplay(
  from?: number | null,
  to?: number | null,
): { text: string; isRange: boolean } | null {
  const low = from ?? 0
  const high = to ?? 0
  if (low > 0 && high > low) return { text: formatPriceRange(low, high), isRange: true }
  const single = low > 0 ? low : high
  return single > 0 ? { text: formatPrice(single, true), isRange: false } : null
}

/** One unit type's price: units carry `price`, older payloads a from/to pair. */
export function unitPriceText(unit: ProjectUnit): string | null {
  return priceDisplay(unit.priceFrom ?? unit.price, unit.priceTo ?? unit.priceMax ?? unit.price)?.text ?? null
}

/** Real inventory from the API: how many units are available out of the total. */
export function projectAvailability(
  project: Pick<Project, "availableUnits" | "totalUnits">,
): { left: number; total: number } | null {
  const { availableUnits: left, totalUnits: total } = project
  if (typeof left !== "number" || typeof total !== "number" || total <= 0) return null
  return { left: Math.max(0, Math.min(left, total)), total }
}

/** Project floor plans plus any unit-level plan image, de-duplicated by URL. */
export function collectFloorPlans(project: Project): FloorPlanItem[] {
  const units = project.units ?? []
  const sizeUnit = units.find((unit) => unit.sizeUnit)?.sizeUnit ?? "sq ft"
  const seen = new Set<string>()
  const items: FloorPlanItem[] = []

  const add = (id: string, label: string, imageUrl: string | null | undefined, meta: string | null) => {
    const url = imageUrl?.trim()
    if (!url || seen.has(url)) return
    seen.add(url)
    items.push({ id, label, imageUrl: url, meta })
  }

  const describe = (bedrooms?: number | null, size?: number | null) =>
    [
      bedrooms != null ? `${bedrooms} Bed` : null,
      size != null ? `${size.toLocaleString("en-BD")} ${sizeUnit}` : null,
    ]
      .filter(Boolean)
      .join(", ") || null

  ;((project as ProjectWithPlans).floorPlans ?? []).forEach((plan, index) => {
    add(plan.id ?? `plan-${index}`, plan.label?.trim() || "Floor plan", plan.imageUrl, describe(plan.bedrooms, plan.size))
  })
  units.forEach((unit, index) => {
    add(
      unit.id ?? `unit-plan-${index}`,
      unit.type ?? unit.name ?? "Floor plan",
      (unit as UnitWithPlan).floorPlan,
      describe(unit.bedrooms, unit.size),
    )
  })

  return items
}

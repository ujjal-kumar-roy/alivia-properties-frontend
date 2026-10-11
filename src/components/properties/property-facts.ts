import {
  Bath,
  BedDouble,
  Briefcase,
  Building2,
  CalendarDays,
  CarFront,
  House,
  LandPlot,
  Layers,
  Maximize2,
  Store,
  Warehouse,
  type LucideIcon,
} from "lucide-react"

import { isRecent } from "@/utils/format-date"
import { formatPrice } from "@/utils/format-price"
import type { Property, PropertyType } from "@/types/property.types"

/**
 * Display helpers for a `Property`, shared by the listing card, the detail
 * page and the compare table. A plain module (no "use client") so server
 * components can call it. Every value comes from the API payload: a fact is
 * only returned when the field exists, nothing is estimated.
 */

export type PropertyFact = {
  key: string
  icon: LucideIcon
  label: string
  /** Redundant on a phone row (the title already says it); still shown from sm. */
  phoneHidden?: boolean
}

const SIZE_UNIT_LABEL: Record<string, string> = {
  sqft: "sq ft",
  katha: "Katha",
  shotangsho: "Shotangsho",
  bigha: "Bigha",
}

const LAND_TYPES: PropertyType[] = ["plot", "land"]

export function isLandType(type: PropertyType): boolean {
  return LAND_TYPES.includes(type)
}

export function propertyTypeLabel(type: PropertyType): string {
  return type.charAt(0).toUpperCase() + type.slice(1)
}

export function propertyTypeIcon(type: PropertyType): LucideIcon {
  switch (type) {
    case "house":
    case "villa":
    case "townhouse":
      return House
    case "plot":
    case "land":
      return LandPlot
    case "commercial":
    case "shop":
      return Store
    case "office":
      return Briefcase
    case "warehouse":
      return Warehouse
    default:
      return Building2
  }
}

export function formatPropertySize(size: number, unit?: string): string {
  const label = unit ? (SIZE_UNIT_LABEL[unit.toLowerCase()] ?? unit) : "sq ft"
  return `${size.toLocaleString("en-BD")} ${label}`
}

/** "Ground floor" for 0, otherwise "Floor 5". Null for land and unknown floors. */
export function formatFloor(p: Pick<Property, "type" | "floorNumber">): string | null {
  if (isLandType(p.type) || p.floorNumber == null) return null
  return p.floorNumber === 0 ? "Ground floor" : `Floor ${p.floorNumber}`
}

/**
 * Price split into the amount and the rent period, so the period can be set in
 * a lighter weight ("৳55,000" + "/month"). `rentPeriod` is real data: some
 * seeded rentals are yearly, so the helper never assumes monthly.
 */
export function getPropertyPrice(p: Pick<Property, "price" | "purpose" | "rentPeriod">): {
  amount: string
  per: string | null
} {
  if (p.purpose === "rent") {
    return {
      amount: formatPrice(p.price, true),
      per: p.rentPeriod?.toLowerCase() === "yearly" ? "/year" : "/month",
    }
  }
  return { amount: formatPrice(p.price, true), per: null }
}

/** The facts for a listing row, most useful first. Callers clip to their space. */
export function getPropertyFacts(p: Property): PropertyFact[] {
  const out: PropertyFact[] = []
  if (p.bedrooms && p.bedrooms > 0) {
    out.push({ key: "bed", icon: BedDouble, label: `${p.bedrooms} Bed` })
  }
  if (p.bathrooms && p.bathrooms > 0) {
    out.push({ key: "bath", icon: Bath, label: `${p.bathrooms} Bath` })
  }
  if (p.size > 0) {
    out.push({ key: "size", icon: Maximize2, label: formatPropertySize(p.size, p.sizeUnit) })
  }
  // Generated titles already say "Apartment" or "Shop": the two-row phone card drops
  // the repeat, larger cards keep it.
  out.push({
    key: "type",
    icon: propertyTypeIcon(p.type),
    label: propertyTypeLabel(p.type),
    phoneHidden: p.title.toLowerCase().includes(p.type),
  })
  const floor = formatFloor(p)
  if (floor) out.push({ key: "floor", icon: Layers, label: floor })
  if (p.parkingSpots && p.parkingSpots > 0) {
    out.push({ key: "parking", icon: CarFront, label: `${p.parkingSpots} Parking` })
  }
  if (p.yearBuilt) {
    out.push({ key: "year", icon: CalendarDays, label: `Built ${p.yearBuilt}` })
  }
  return out
}

/** Labelled specs for the detail page key-facts grid. */
export type PropertySpec = { key: string; icon: LucideIcon; label: string; value: string }

export function getPropertySpecs(p: Property): PropertySpec[] {
  const out: PropertySpec[] = []
  if (p.bedrooms !== undefined && p.bedrooms !== null && !isLandType(p.type)) {
    out.push({ key: "bed", icon: BedDouble, label: "Bedrooms", value: String(p.bedrooms) })
  }
  if (p.bathrooms !== undefined && p.bathrooms !== null && !isLandType(p.type)) {
    out.push({ key: "bath", icon: Bath, label: "Bathrooms", value: String(p.bathrooms) })
  }
  out.push({
    key: "size",
    icon: Maximize2,
    label: "Size",
    value: formatPropertySize(p.size, p.sizeUnit),
  })
  const floor = formatFloor(p)
  if (floor) {
    out.push({
      key: "floor",
      icon: Layers,
      label: "Floor",
      value: p.totalFloors ? `${floor} of ${p.totalFloors}` : floor,
    })
  }
  if (p.parkingSpots && p.parkingSpots > 0) {
    out.push({ key: "parking", icon: CarFront, label: "Parking", value: String(p.parkingSpots) })
  }
  if (p.yearBuilt) {
    out.push({ key: "year", icon: CalendarDays, label: "Year built", value: String(p.yearBuilt) })
  }
  out.push({
    key: "type",
    icon: propertyTypeIcon(p.type),
    label: "Type",
    value: propertyTypeLabel(p.type),
  })
  return out
}

/** "Today", "5d ago", "3w ago", "3mo ago", "1y ago". Null when the date is unusable. */
export function listedAgo(iso?: string): string | null {
  if (!iso) return null
  const time = Date.parse(iso)
  if (Number.isNaN(time)) return null
  const days = Math.floor((Date.now() - time) / 86_400_000)
  if (days < 1) return "Today"
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

export function isNewListing(iso?: string): boolean {
  return isRecent(iso, 14)
}

/** The seller's display name, or null when the API only gave the "Seller" fallback. */
export function sellerLabel(p: Pick<Property, "sellerName">): string | null {
  const name = p.sellerName?.trim()
  return name && name.toLowerCase() !== "seller" ? name : null
}

/**
 * wa.me wants the full international number with no "+" or leading zero.
 * Bangladesh mobiles are stored as "01XXXXXXXXX" or "+8801XXXXXXXXX".
 */
export function whatsappNumber(raw?: string | null): string | null {
  const digits = (raw ?? "").replace(/\D/g, "")
  if (digits.length < 8) return null
  if (digits.startsWith("880")) return digits
  if (digits.startsWith("0")) return `88${digits}`
  return `880${digits}`
}

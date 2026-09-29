/**
 * Level of a node in the Department → Category taxonomy. Categories are the leaf
 * nodes. SUBCATEGORY is retained for backward compatibility with legacy data but
 * is no longer created or browsed.
 */
export type CategoryLevel = "DEPARTMENT" | "CATEGORY" | "SUBCATEGORY"

/** The unique image shown on a category tile in the quote wizard. */
export type CategoryImage = {
  key: string
  url: string
  alt?: string | null
  width?: number | null
  height?: number | null
}

/** A single captured spec value (answer to a configured spec field). */
export type SpecValue = {
  key: string
  label: string
  value: string
  unit?: string | null
}

/** A supplier's concrete SKU within a sub-category. */
export type ProductVariant = {
  id: string
  name: string
  sku?: string | null
  unit: string
  price?: number | null
  specs?: SpecValue[]
  isActive: boolean
}

export type CategoryAttributeType = "TEXT" | "NUMBER" | "SELECT"

/** Admin-configured named variant for a (sub-)category, picked by buyers. */
export type CategoryVariant = {
  id: string
  name: string
  description?: string | null
  unit?: string | null
  order?: number
  isActive: boolean
}

/** Admin-configured spec field rendered as a dynamic input on the quote form. */
export type CategoryAttribute = {
  id: string
  key: string
  label: string
  type: CategoryAttributeType
  options?: string[]
  unit?: string | null
  required?: boolean
  order?: number
}

export type ProductDocument = {
  label: string
  url: string
}

export type ProductPriceTier = {
  minQty: number
  maxQty?: number | null
  price: number
  note?: string | null
}

export type MarketplaceProduct = {
  id: string
  slug: string
  name: string
  supplierId: string
  categorySlug: string
  image: string
  price: number
  unit: string
  description: string
  shortDescription?: string | null
  inStock: boolean
  moq?: number
  leadTimeDays?: number
  brand?: string
  variants?: ProductVariant[]
  rating?: number
  reviewCount?: number
  badge?: string
  gallery?: string[]
  videoUrl?: string | null
  externalVideoUrl?: string | null
  documents?: ProductDocument[]
  specs?: SpecValue[]
  highlights?: string[]
  sku?: string | null
  warranty?: string | null
  origin?: string | null
  packaging?: string | null
  certifications?: string[]
  priceTiers?: ProductPriceTier[]
  isActive: boolean
  isFeatured: boolean
  order: number
}

export type SupplierKind = "supplier" | "service" | "SUPPLIER" | "SERVICE"

export type Supplier = {
  id: string
  slug: string
  name: string
  kind: SupplierKind
  tagline?: string | null
  logo?: string | null
  coverImage?: string | null
  location: string
  serviceAreas: string[]
  rating: number
  reviewCount: number
  yearsInBusiness: number
  responseTimeHours?: number | null
  deliveryDays?: number | null
  priceRange?: string | null
  brands?: string[]
  certifications?: string[]
  phone: string
  whatsApp?: string
  email?: string
  isVerified: boolean
  isFeatured: boolean
  categories: string[]
  /** Card engagement / commerce signals. */
  gallery?: string[]
  videoUrl?: string | null
  inStock?: boolean
  itemsSold?: number
  products?: MarketplaceProduct[]
}

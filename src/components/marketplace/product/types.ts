import type { ProductWithSupplier } from "@/services/marketplace.service"
import type { Supplier } from "@/types/marketplace.types"

/**
 * The product detail endpoint returns the whole supplier, but the shared
 * `ProductWithSupplier` type only declares a handful of its fields. This adds
 * the ones the product page and its sections read.
 */
export type DetailSupplier = NonNullable<ProductWithSupplier["supplier"]> &
  Partial<
    Pick<
      Supplier,
      | "tagline"
      | "logo"
      | "location"
      | "isVerified"
      | "whatsApp"
      | "yearsInBusiness"
      | "responseTimeHours"
      | "deliveryDays"
      | "serviceAreas"
    >
  >

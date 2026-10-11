import type { MarketplaceProduct } from "@/types/marketplace.types"

/** tel: link from a stored phone number, or null when there is none. */
export function telHref(raw?: string | null): string | null {
  const value = (raw ?? "").replace(/\s+/g, "")
  return value ? `tel:${value}` : null
}

/** wa.me link from a stored WhatsApp number, or null when there is none. */
export function whatsappHref(raw?: string | null): string | null {
  const digits = (raw ?? "").replace(/\D/g, "")
  return digits ? `https://wa.me/${digits}` : null
}

/**
 * The lowest real price a product shows: its own, or its cheapest priced
 * variant. null means "quote on request" (the catalogue stores 0 for those).
 */
export function productStartingPrice(
  product: Pick<MarketplaceProduct, "price" | "variants">,
): number | null {
  const prices = [
    product.price,
    ...(product.variants ?? [])
      .filter((variant) => variant.isActive !== false)
      .map((variant) => variant.price ?? 0),
  ].filter((value): value is number => typeof value === "number" && value > 0)

  return prices.length > 0 ? Math.min(...prices) : null
}

/** Number of buyer-selectable variants (packages for services). */
export function activeVariantCount(product: Pick<MarketplaceProduct, "variants">): number {
  return (product.variants ?? []).filter((variant) => variant.isActive !== false).length
}

/** A rating worth showing: present and above zero. */
export function visibleRating(rating?: number | null): number | null {
  return typeof rating === "number" && rating > 0 ? rating : null
}

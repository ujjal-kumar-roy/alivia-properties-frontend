import { productStartingPrice } from "@/components/marketplace/product-meta"
import type { MarketplaceProduct, SupplierKind } from "@/types/marketplace.types"

/** The seller fields a card reads; no phone, email or profile text. */
export type CardSupplier = {
  id?: string
  slug?: string
  name: string
  kind?: SupplierKind
}

/**
 * What MarketplaceProductCard, ProductRow and their add-to-quote button read
 * from a product, and nothing else. Both are client components, so every prop
 * is serialised into the page (and into each infinite-scroll response); pass
 * them this, not the full record with its description, gallery, specs,
 * documents, variants and tiers.
 */
export type CardProduct = Pick<
  MarketplaceProduct,
  | "id"
  | "slug"
  | "name"
  | "supplierId"
  | "image"
  | "price"
  | "unit"
  | "inStock"
  | "moq"
  | "leadTimeDays"
  | "brand"
> & {
  /** productStartingPrice() worked out on the server, so variants stay there. */
  startingPrice: number | null
  supplier?: CardSupplier
}

/**
 * Trim a product to its card fields. Call it on the server, at the boundary
 * where products are handed to a client component (page props, server actions).
 */
export function toCardProduct(
  product: MarketplaceProduct & { supplier?: CardSupplier },
): CardProduct {
  const { supplier } = product
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    supplierId: product.supplierId,
    image: product.image,
    price: product.price,
    unit: product.unit,
    inStock: product.inStock,
    moq: product.moq,
    leadTimeDays: product.leadTimeDays,
    brand: product.brand,
    startingPrice: productStartingPrice(product),
    supplier: supplier && {
      id: supplier.id,
      slug: supplier.slug,
      name: supplier.name,
      kind: supplier.kind,
    },
  }
}

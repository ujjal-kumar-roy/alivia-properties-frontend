import { MarketplaceProductCard } from "@/components/marketplace/MarketplaceProductCard"
import type { ProductWithSupplier } from "@/services/marketplace.service"

import { RailScroller } from "./RailScroller"

type ProductRailProps = {
  title: string
  /** "See all" destination (the category or seller page). */
  href?: string
  products: ProductWithSupplier[]
  /**
   * Name each card photo for the card-to-page morph. A name may appear once per
   * page, so turn it off for a rail whose products also appear in an earlier one.
   */
  morph?: boolean
}

/**
 * A row of product cards that scrolls sideways with snap. Cards are rendered on
 * the server; only the scroller (buttons, edge fades) is client code. Renders
 * nothing for an empty list so the page needs no guard.
 */
export function ProductRail({ title, href, products, morph = true }: ProductRailProps) {
  if (products.length === 0) return null

  return (
    <RailScroller title={title} href={href}>
      {products.map((product) => (
        <li key={product.id} className="flex w-40 shrink-0 snap-start md:w-55">
          <MarketplaceProductCard product={product} morph={morph} className="w-full" />
        </li>
      ))}
    </RailScroller>
  )
}

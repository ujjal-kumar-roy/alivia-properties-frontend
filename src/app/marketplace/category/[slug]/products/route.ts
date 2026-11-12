import type { NextRequest } from "next/server";

import { toCardProduct } from "@/components/marketplace/card-product";
import { marketplaceService } from "@/services/marketplace.service";

import { respondWithListing, type ListingContext } from "../listing-endpoint";

export const dynamic = "force-dynamic";

/**
 * GET /marketplace/category/:slug/products?page=2&limit=24&sort=&kind=&search=
 * One page of the category listing's product cards (see ../listing-endpoint.ts).
 */
export function GET(request: NextRequest, context: ListingContext) {
  return respondWithListing(request, context, "products", async (query) => {
    const page = await marketplaceService.listProducts(query);
    // The browser only gets what a card reads, not descriptions, galleries or
    // seller contact details.
    return { ...page, data: page.data.map(toCardProduct) };
  });
}

import type { NextRequest } from "next/server";

import { marketplaceService } from "@/services/marketplace.service";

import { respondWithListing, type ListingContext } from "../listing-endpoint";

export const dynamic = "force-dynamic";

/**
 * GET /marketplace/category/:slug/suppliers?page=2&limit=24&sort=&kind=&search=
 * One page of the category listing's sellers (see ../listing-endpoint.ts).
 */
export function GET(request: NextRequest, context: ListingContext) {
  return respondWithListing(request, context, "suppliers", (query) =>
    marketplaceService.listSuppliers(query),
  );
}

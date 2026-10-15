"use server";

import type { Paginated } from "@/services/http-client";
import {
  marketplaceService,
  type ProductWithSupplier,
} from "@/services/marketplace.service";
import type { Supplier } from "@/types/marketplace.types";

/**
 * Next-page loaders for the category listing's infinite scroll. They run on
 * the server, so the browser never calls the API directly (no CORS) and the
 * request matches the one the page made for page 1.
 *
 * Server Functions are public POST endpoints, so every field is checked here.
 * The values are passed through, never "corrected": page 2 must use exactly
 * the sort, filter and search page 1 used, or the list would skip or repeat
 * items. A value of the wrong shape is rejected instead.
 */

/** Must match the page's first-page size, or pages would overlap or skip. */
const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 48;
const MAX_PAGE = 10_000;
const MAX_SEARCH_LENGTH = 200;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;
/** `field:asc|desc`, as `sortToApi()` produces. The backend rejects unknown fields. */
const SORT_PATTERN = /^[A-Za-z][A-Za-z0-9]{0,39}:(asc|desc)$/;

type LoadInput = {
  category: string;
  page: number;
  sort?: string;
  kind?: "SUPPLIER" | "SERVICE";
  search?: string;
  /** Page size; defaults to the page's 24. Clients pass the first page's `meta.limit`. */
  limit?: number;
};

function listParams(input: LoadInput) {
  if (!input || typeof input !== "object") throw new Error("Invalid request");
  const { category, page, sort, kind, search, limit } = input;

  if (typeof category !== "string" || category.length > 120 || !SLUG_PATTERN.test(category)) {
    throw new Error("Invalid category");
  }
  if (!Number.isInteger(page) || page < 1 || page > MAX_PAGE) {
    throw new Error("Invalid page");
  }
  if (sort !== undefined && (typeof sort !== "string" || !SORT_PATTERN.test(sort))) {
    throw new Error("Invalid sort");
  }
  if (search !== undefined && typeof search !== "string") {
    throw new Error("Invalid search");
  }
  const size =
    typeof limit === "number" && Number.isInteger(limit) && limit > 0
      ? Math.min(limit, MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;

  return {
    category,
    page,
    limit: size,
    sort: sort || undefined,
    kind: kind === "SUPPLIER" || kind === "SERVICE" ? kind : undefined,
    search: search ? search.slice(0, MAX_SEARCH_LENGTH) : undefined,
  };
}

export async function loadCategoryProducts(
  input: LoadInput,
): Promise<Paginated<ProductWithSupplier>> {
  return marketplaceService.listProducts(listParams(input));
}

export async function loadCategorySuppliers(
  input: LoadInput,
): Promise<Paginated<Supplier>> {
  return marketplaceService.listSuppliers(listParams(input));
}

"use server";

import {
  SEARCH_MAX_LENGTH,
  sortOptionsFor,
  type ListingView,
} from "@/components/marketplace/category-filters";
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
 * Server Functions are public POST endpoints, so every field is checked here
 * against what the page itself can send: the listing's sort whitelist, the two
 * seller types, the page's search cap. Values are passed through, never
 * "corrected": page 2 must use exactly the sort, filter and search page 1
 * used, or the list would skip or repeat items. Anything else is rejected.
 */

/** Must match the page's first-page size, or pages would overlap or skip. */
const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 48;
const MAX_PAGE = 10_000;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;

type LoadInput = {
  category: string;
  page: number;
  sort?: string;
  kind?: "SUPPLIER" | "SERVICE";
  search?: string;
  /** Page size; defaults to the page's 24. Clients pass the first page's `meta.limit`. */
  limit?: number;
};

function listParams(input: LoadInput, view: ListingView) {
  if (!input || typeof input !== "object") throw new Error("Invalid request");
  const { category, page, sort, kind, search, limit } = input;

  if (typeof category !== "string" || category.length > 120 || !SLUG_PATTERN.test(category)) {
    throw new Error("Invalid category");
  }
  if (!Number.isInteger(page) || page < 1 || page > MAX_PAGE) {
    throw new Error("Invalid page");
  }
  // Only the API orders this view's sort menu offers (what sortToApi() returns),
  // so a public endpoint never asks the backend to order by an arbitrary field.
  if (
    sort !== undefined &&
    !sortOptionsFor(view).some((option) => option.api === sort)
  ) {
    throw new Error("Invalid sort");
  }
  if (kind !== undefined && kind !== "SUPPLIER" && kind !== "SERVICE") {
    throw new Error("Invalid kind");
  }
  if (
    search !== undefined &&
    (typeof search !== "string" || search.length > SEARCH_MAX_LENGTH)
  ) {
    throw new Error("Invalid search");
  }
  if (
    limit !== undefined &&
    (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE)
  ) {
    throw new Error("Invalid limit");
  }

  return {
    category,
    page,
    limit: limit ?? DEFAULT_PAGE_SIZE,
    sort,
    kind,
    search: search || undefined,
  };
}

export async function loadCategoryProducts(
  input: LoadInput,
): Promise<Paginated<ProductWithSupplier>> {
  return marketplaceService.listProducts(listParams(input, "products"));
}

export async function loadCategorySuppliers(
  input: LoadInput,
): Promise<Paginated<Supplier>> {
  return marketplaceService.listSuppliers(listParams(input, "suppliers"));
}

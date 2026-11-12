import type { CardProduct } from "@/components/marketplace/card-product"
import type { Supplier } from "@/types/marketplace.types"
import type { Paginated } from "./http-client"

/**
 * The browser's loaders for the category listing's next pages (infinite scroll).
 * They are plain GETs to this app's own route handlers, not calls to the API and
 * not Server Functions: the nginx in front of production rejects the text/plain
 * POST that React sends for a Server Function, and a GET gets through. The
 * handlers (src/app/marketplace/category/[slug]/{products,suppliers}/route.ts)
 * check every field, so these are exactly the values they accept.
 */

export type CategoryResultsQuery = {
  category: string
  page: number
  /** Page size; the handlers default to 24. Pass the first page's `meta.limit`. */
  limit?: number
  /** An API order from the listing's sort menu (what `sortToApi()` returns). */
  sort?: string
  kind?: "SUPPLIER" | "SERVICE"
  search?: string
}

async function loadPage<T>(
  view: "products" | "suppliers",
  { category, ...query }: CategoryResultsQuery,
): Promise<Paginated<T>> {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value))
  }
  const response = await fetch(
    `/marketplace/category/${encodeURIComponent(category)}/${view}?${params}`,
    { headers: { Accept: "application/json" } },
  )
  if (!response.ok) throw new Error(`Could not load ${view} (HTTP ${response.status})`)
  return (await response.json()) as Paginated<T>
}

export const categoryResultsService = {
  listProducts(query: CategoryResultsQuery): Promise<Paginated<CardProduct>> {
    return loadPage<CardProduct>("products", query)
  },
  listSuppliers(query: CategoryResultsQuery): Promise<Paginated<Supplier>> {
    return loadPage<Supplier>("suppliers", query)
  },
}

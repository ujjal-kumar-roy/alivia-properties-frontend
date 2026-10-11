/**
 * Sort and type options for a category listing. Plain module (no "use client")
 * so the server page and the client filter sheet share one definition.
 * `api` values are fields the backend can order by (Prisma rejects unknown
 * ones, so only whitelisted keys ever reach the request).
 */

export type ListingView = "products" | "suppliers"
export type SortKey = "newest" | "rating" | "reviews" | "name" | "price-asc" | "price-desc"
export type KindKey = "all" | "SUPPLIER" | "SERVICE"

type SortOption = { value: SortKey; label: string; api: string; views: ListingView[] }

export const SORT_OPTIONS: SortOption[] = [
  { value: "newest", label: "Newest first", api: "createdAt:desc", views: ["products", "suppliers"] },
  { value: "rating", label: "Top rated", api: "rating:desc", views: ["products", "suppliers"] },
  { value: "reviews", label: "Most reviewed", api: "reviewCount:desc", views: ["products", "suppliers"] },
  { value: "name", label: "Name A to Z", api: "name:asc", views: ["products", "suppliers"] },
  { value: "price-asc", label: "Price, low to high", api: "price:asc", views: ["products"] },
  { value: "price-desc", label: "Price, high to low", api: "price:desc", views: ["products"] },
]

export const KIND_OPTIONS: { value: KindKey; label: string }[] = [
  { value: "all", label: "All sellers" },
  { value: "SUPPLIER", label: "Material suppliers" },
  { value: "SERVICE", label: "Service providers" },
]

export function sortOptionsFor(view: ListingView) {
  return SORT_OPTIONS.filter((option) => option.views.includes(view))
}

export function parseSort(raw: string | undefined, view: ListingView): SortKey {
  const found = sortOptionsFor(view).find((option) => option.value === raw)
  return found ? found.value : "newest"
}

/** The `sort` query value for the API, or undefined for the default order. */
export function sortToApi(sort: SortKey): string | undefined {
  if (sort === "newest") return undefined
  return SORT_OPTIONS.find((option) => option.value === sort)?.api
}

export function parseKind(raw: string | undefined): KindKey {
  return raw === "SUPPLIER" || raw === "SERVICE" ? raw : "all"
}

export function parseView(raw: string | undefined): ListingView | undefined {
  return raw === "products" || raw === "suppliers" ? raw : undefined
}

/** Builds a listing URL, leaving defaults out so shared links stay short. */
export function listingHref(
  basePath: string,
  state: { view?: ListingView; sort?: SortKey; kind?: KindKey; page?: number },
): string {
  const params = new URLSearchParams()
  if (state.view) params.set("view", state.view)
  if (state.sort && state.sort !== "newest") params.set("sort", state.sort)
  if (state.kind && state.kind !== "all") params.set("kind", state.kind)
  if (state.page && state.page > 1) params.set("page", String(state.page))
  const query = params.toString()
  return query ? `${basePath}?${query}` : basePath
}

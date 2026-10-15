/**
 * Sort, seller-type and search state for a category listing. Plain module (no
 * "use client") so the server page and the client toolbar share one definition.
 * `api` values are fields the backend can order by (Prisma rejects unknown
 * ones, so only whitelisted keys ever reach the request). Rating and review
 * sorts are deliberately absent: that data is empty in production, so they
 * would reorder nothing.
 */

export type ListingView = "products" | "suppliers"
export type SortKey = "newest" | "price-asc" | "price-desc" | "name"
export type KindKey = "all" | "SUPPLIER" | "SERVICE"

type SortOption = { value: SortKey; label: string; api: string; views: ListingView[] }

export const SORT_OPTIONS: SortOption[] = [
  { value: "newest", label: "Newest", api: "createdAt:desc", views: ["products", "suppliers"] },
  { value: "price-asc", label: "Price: low to high", api: "price:asc", views: ["products"] },
  { value: "price-desc", label: "Price: high to low", api: "price:desc", views: ["products"] },
  { value: "name", label: "Name: A to Z", api: "name:asc", views: ["products", "suppliers"] },
]

export const KIND_OPTIONS: { value: KindKey; label: string }[] = [
  { value: "all", label: "All sellers" },
  { value: "SUPPLIER", label: "Material sellers" },
  { value: "SERVICE", label: "Service providers" },
]

/** Longest search text sent to the API; anything longer is cut, not rejected. */
export const SEARCH_MAX_LENGTH = 80

export function sortOptionsFor(view: ListingView) {
  return SORT_OPTIONS.filter((option) => option.views.includes(view))
}

/** Unknown or retired keys (e.g. an old `sort=rating` link) fall back to newest. */
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

/**
 * Collapses whitespace and caps the length, so the same search always yields the
 * same URL. Cuts by code point (never inside a surrogate pair) and trims again
 * after the cut, so normalising twice gives the same string.
 */
export function normalizeSearch(raw: string | undefined): string {
  const collapsed = (raw ?? "").replace(/\s+/g, " ").trim()
  return Array.from(collapsed).slice(0, SEARCH_MAX_LENGTH).join("").trim()
}

/** The `q` search param, normalised; "" when absent. */
export function parseSearch(raw: string | undefined): string {
  return normalizeSearch(raw)
}

/** Builds a listing URL, leaving defaults out so shared links stay short. */
export function listingHref(
  basePath: string,
  state: {
    view?: ListingView
    sort?: SortKey
    kind?: KindKey
    page?: number
    /** Free-text search; written as `q`. */
    search?: string
  },
): string {
  const params = new URLSearchParams()
  if (state.view) params.set("view", state.view)
  if (state.sort && state.sort !== "newest") params.set("sort", state.sort)
  if (state.kind && state.kind !== "all") params.set("kind", state.kind)
  const search = normalizeSearch(state.search)
  if (search) params.set("q", search)
  if (state.page && state.page > 1) params.set("page", String(state.page))
  const query = params.toString()
  return query ? `${basePath}?${query}` : basePath
}

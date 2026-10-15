import { LS_RECENT_PRODUCTS } from "@/lib/constants"

/**
 * "Recently viewed" products, kept on the visitor's device only (localStorage).
 * A snapshot is stored per product, so the rail can draw cards without any
 * request. Prices are therefore as of the last visit, not live.
 */
export type RecentProduct = {
  slug: string
  name: string
  image: string
  price: number
  unit: string
  supplierName?: string
  viewedAt: number
}

/** Most recent first; older entries fall off the end. */
export const MAX_RECENT_PRODUCTS = 12

/** Same-tab change signal (the `storage` event only fires in other tabs). */
export const RECENT_PRODUCTS_EVENT = "alivia:recent-products"

const EMPTY: RecentProduct[] = []

/** Keeps only well-formed entries: storage is user-editable and may predate this shape. */
function parse(raw: string | null): RecentProduct[] {
  if (!raw) return EMPTY
  try {
    const data: unknown = JSON.parse(raw)
    if (!Array.isArray(data)) return EMPTY
    const items: RecentProduct[] = []
    for (const entry of data) {
      if (!entry || typeof entry !== "object") continue
      const e = entry as Record<string, unknown>
      if (typeof e.slug !== "string" || !e.slug) continue
      if (typeof e.name !== "string" || !e.name) continue
      items.push({
        slug: e.slug,
        name: e.name,
        image: typeof e.image === "string" ? e.image : "",
        price: typeof e.price === "number" && e.price > 0 ? e.price : 0,
        unit: typeof e.unit === "string" ? e.unit : "",
        supplierName: typeof e.supplierName === "string" && e.supplierName ? e.supplierName : undefined,
        viewedAt: typeof e.viewedAt === "number" ? e.viewedAt : 0,
      })
    }
    return items.slice(0, MAX_RECENT_PRODUCTS)
  } catch {
    return EMPTY
  }
}

function readRaw(): string | null {
  try {
    return localStorage.getItem(LS_RECENT_PRODUCTS)
  } catch {
    return null // private mode / blocked storage
  }
}

/** SSR-safe: `[]` on the server, on a parse error, or when storage is blocked. */
export function readRecentProducts(): RecentProduct[] {
  if (typeof window === "undefined") return EMPTY
  return parse(readRaw())
}

/** Puts a product at the front, dropping any older entry for it and trimming to the cap. */
export function recordRecentProduct(product: Omit<RecentProduct, "viewedAt">) {
  if (typeof window === "undefined" || !product.slug || !product.name) return
  const next: RecentProduct[] = [
    { ...product, viewedAt: Date.now() },
    ...readRecentProducts().filter((item) => item.slug !== product.slug),
  ].slice(0, MAX_RECENT_PRODUCTS)
  try {
    localStorage.setItem(LS_RECENT_PRODUCTS, JSON.stringify(next))
  } catch {
    return // storage full or blocked: recently viewed is a nicety, never an error
  }
  window.dispatchEvent(new Event(RECENT_PRODUCTS_EVENT))
}

export function clearRecentProducts() {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(LS_RECENT_PRODUCTS)
  } catch {
    return
  }
  window.dispatchEvent(new Event(RECENT_PRODUCTS_EVENT))
}

/** For `useSyncExternalStore`: same tab (custom event) and other tabs (`storage`). */
export function subscribeRecentProducts(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === LS_RECENT_PRODUCTS) onChange()
  }
  window.addEventListener(RECENT_PRODUCTS_EVENT, onChange)
  window.addEventListener("storage", onStorage)
  return () => {
    window.removeEventListener(RECENT_PRODUCTS_EVENT, onChange)
    window.removeEventListener("storage", onStorage)
  }
}

// `useSyncExternalStore` compares snapshots by identity, so parse only when the
// stored string actually changed; otherwise every read would look like a change.
let cache: { raw: string | null; value: RecentProduct[] } = { raw: null, value: EMPTY }

export function getRecentProductsSnapshot(): RecentProduct[] {
  const raw = readRaw()
  if (raw !== cache.raw) cache = { raw, value: parse(raw) }
  return cache.value
}

export function getRecentProductsServerSnapshot(): RecentProduct[] {
  return EMPTY
}

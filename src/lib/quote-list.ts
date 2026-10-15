import { LS_MARKETPLACE_CART } from "@/lib/constants"

/**
 * The buyer's quote list: products collected on this device, sent later as one
 * request per product. Framework-free storage layer; React reads it through
 * `useQuoteList()` (src/hooks/use-quote-list.ts).
 */
export type QuoteListItem = {
  productId: string
  slug: string
  name: string
  image: string
  /** BDT per unit. 0 means "ask for a price". */
  price: number
  unit: string
  moq?: number
  supplierId?: string
  supplierSlug?: string
  supplierName?: string
  qty: number
  addedAt: number
}

export const QUOTE_LIST_EVENT = "alivia:quote-list"
/** Fired by a landing add-to-quote flight; the header button bumps its count badge. */
export const QUOTE_LIST_BUMP_EVENT = "alivia:quote-list-bump"

const EMPTY: QuoteListItem[] = []

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined
}

/** Quantities are whole numbers of at least 1. */
function toQty(value: unknown, fallback = 1): number {
  return finite(value) ? Math.max(1, Math.floor(value)) : fallback
}

// Storage is user-editable and survives deploys: accept only well-formed rows.
function sanitize(value: unknown): QuoteListItem | null {
  if (!value || typeof value !== "object") return null
  const v = value as Record<string, unknown>
  const productId = text(v.productId)
  const slug = text(v.slug)
  const name = text(v.name)
  if (!productId || !slug || !name) return null
  return {
    productId,
    slug,
    name,
    image: typeof v.image === "string" ? v.image : "",
    price: finite(v.price) && v.price > 0 ? v.price : 0,
    unit: typeof v.unit === "string" ? v.unit : "",
    ...(finite(v.moq) && v.moq > 0 ? { moq: v.moq } : {}),
    ...(text(v.supplierId) ? { supplierId: text(v.supplierId) } : {}),
    ...(text(v.supplierSlug) ? { supplierSlug: text(v.supplierSlug) } : {}),
    ...(text(v.supplierName) ? { supplierName: text(v.supplierName) } : {}),
    qty: toQty(v.qty),
    addedAt: finite(v.addedAt) ? v.addedAt : 0,
  }
}

function parse(raw: string | null): QuoteListItem[] {
  if (!raw) return EMPTY
  try {
    const data: unknown = JSON.parse(raw)
    if (!Array.isArray(data)) return EMPTY
    const seen = new Set<string>()
    const items: QuoteListItem[] = []
    for (const row of data) {
      const item = sanitize(row)
      if (item && !seen.has(item.productId)) {
        seen.add(item.productId)
        items.push(item)
      }
    }
    return items
  } catch {
    return EMPTY
  }
}

// When storage is blocked (some in-app browsers, strict privacy modes) writes
// throw. The list then lives in memory for the page session instead of the
// button silently doing nothing. `undefined` = storage is working.
let memoryRaw: string | null | undefined

function readRaw(): string | null {
  if (memoryRaw !== undefined) return memoryRaw
  try {
    return window.localStorage.getItem(LS_MARKETPLACE_CART)
  } catch {
    return null
  }
}

/** Current list. `[]` on the server and on a parse error. Treat the result as read-only. */
export function readQuoteList(): QuoteListItem[] {
  if (typeof window === "undefined") return EMPTY
  return parse(readRaw())
}

/** Persists the list and tells every mounted `useQuoteList()` in this tab. */
export function writeQuoteList(items: QuoteListItem[]) {
  if (typeof window === "undefined") return
  const raw = items.length > 0 ? JSON.stringify(items) : null
  try {
    if (raw === null) window.localStorage.removeItem(LS_MARKETPLACE_CART)
    else window.localStorage.setItem(LS_MARKETPLACE_CART, raw)
    memoryRaw = undefined
  } catch {
    memoryRaw = raw
  }
  window.dispatchEvent(new Event(QUOTE_LIST_EVENT))
}

// useSyncExternalStore needs a snapshot that keeps its identity until the data
// changes, so the parsed list is cached against the raw string it came from.
let snapshotRaw: string | null = null
let snapshot: QuoteListItem[] = EMPTY

export function getQuoteListSnapshot(): QuoteListItem[] {
  if (typeof window === "undefined") return EMPTY
  const raw = readRaw()
  if (raw !== snapshotRaw) {
    snapshotRaw = raw
    snapshot = parse(raw)
  }
  return snapshot
}

export function getQuoteListServerSnapshot(): QuoteListItem[] {
  return EMPTY
}

export function subscribeQuoteList(onChange: () => void) {
  // `storage` fires in other tabs only; the custom event covers this one.
  function onStorage(e: StorageEvent) {
    if (e.key === null || e.key === LS_MARKETPLACE_CART) onChange()
  }
  window.addEventListener("storage", onStorage)
  window.addEventListener(QUOTE_LIST_EVENT, onChange)
  return () => {
    window.removeEventListener("storage", onStorage)
    window.removeEventListener(QUOTE_LIST_EVENT, onChange)
  }
}

export type QuoteListInput = Omit<QuoteListItem, "qty" | "addedAt"> & { qty?: number }

/**
 * Adds a product. If it is already listed, its details are refreshed and, when
 * `qty` is given, that quantity is added to the existing one (a repeat add never
 * creates a second row). A new row with no `qty` starts at the seller's minimum
 * order, or 1.
 */
export function addToQuoteList(input: QuoteListInput) {
  const { qty, ...details } = input
  const list = readQuoteList()
  const at = list.findIndex((row) => row.productId === details.productId)
  if (at === -1) {
    const start = toQty(qty, toQty(details.moq))
    writeQuoteList([...list, { ...details, qty: start, addedAt: Date.now() }])
    return
  }
  const existing = list[at]
  const next = list.slice()
  next[at] = {
    ...existing,
    ...details,
    qty: qty === undefined ? existing.qty : existing.qty + toQty(qty),
    addedAt: existing.addedAt,
  }
  writeQuoteList(next)
}

export function removeFromQuoteList(productId: string) {
  const list = readQuoteList()
  const next = list.filter((row) => row.productId !== productId)
  if (next.length !== list.length) writeQuoteList(next)
}

export function setQuoteListQty(productId: string, qty: number) {
  const next = toQty(qty)
  const list = readQuoteList()
  if (!list.some((row) => row.productId === productId && row.qty !== next)) return
  writeQuoteList(list.map((row) => (row.productId === productId ? { ...row, qty: next } : row)))
}

export function clearQuoteList() {
  if (readQuoteList().length > 0) writeQuoteList([])
}

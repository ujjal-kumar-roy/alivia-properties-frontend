"use client"

import Link from "next/link"
import { AnimatePresence, motion } from "motion/react"
import { ArrowUp, CircleAlert } from "lucide-react"
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type RefObject,
} from "react"

import { loadCategoryProducts } from "@/app/marketplace/category/[slug]/actions"
import { ProductRow } from "@/components/marketplace/category/ProductRow"
import {
  PRODUCT_GRID_CLASS,
  PRODUCT_LIST_CLASS,
  ProductCardSkeleton,
  ProductRowSkeleton,
} from "@/components/marketplace/category/ResultSkeletons"
import { MarketplaceProductCard } from "@/components/marketplace/MarketplaceProductCard"
import { useListingLayout, type ListingLayout } from "@/hooks/use-listing-layout"
import type { Paginated } from "@/services/http-client"
import type { ProductWithSupplier } from "@/services/marketplace.service"

export type ResultsQuery = {
  category: string
  sort?: string
  kind?: "SUPPLIER" | "SERVICE"
  search?: string
}

type ProductResultsProps = {
  initial: Paginated<ProductWithSupplier>
  query: ResultsQuery
  nextHref: string | null
}

/**
 * Category product results: grid (MarketplaceProductCard, 2/3/4/6 columns) or
 * dense list (ProductRow), following the toolbar's layout toggle, with
 * infinite loading. The first page arrives from the server and renders exactly
 * as the server markup, so hydration matches; later pages come from a Server
 * Function as the visitor nears the end, or from the "Show more" link, which is
 * a real link to `?page=n` until JS takes it over.
 */
export function ProductResults(props: ProductResultsProps) {
  // A new query (sort, filter, search) or start page starts a fresh list:
  // appended pages never leak from one query into the next.
  const key = feedKey("products", props.query, props.initial.meta.page)
  return <ProductFeed key={key} cacheKey={key} {...props} />
}

function ProductFeed({
  initial,
  query,
  nextHref,
  cacheKey,
}: ProductResultsProps & { cacheKey: string }) {
  const [layout] = useListingLayout()
  const listRef = useRef<HTMLUListElement | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const limit = initial.meta.limit || undefined
  const load = useCallback(
    (page: number) => loadCategoryProducts({ ...query, page, limit }),
    [query, limit],
  )
  const feed = useResultsFeed({
    initial,
    load,
    cacheKey,
    nextHref,
    listRef,
    sentinelRef,
    noun: PRODUCT_NOUN,
  })

  // Keep the visitor's place when the layout flips mid-list: note the first
  // product in view while the old layout is still on screen, then scroll so
  // the same product sits at the same height in the new one (before paint).
  const anchorRef = useRef<{ id: string; top: number } | null>(null)
  const shownLayoutRef = useRef(layout)
  useLayoutEffect(() => {
    if (shownLayoutRef.current === layout) return
    shownLayoutRef.current = layout
    anchorRef.current = findAnchor(listRef.current)
  }, [layout])
  const attachList = useCallback((el: HTMLUListElement | null) => {
    listRef.current = el
    const anchor = anchorRef.current
    if (!el || !anchor) return
    anchorRef.current = null
    const target = el.querySelector(`[data-id="${CSS.escape(anchor.id)}"]`)
    if (!target) return
    const delta = target.getBoundingClientRect().top - anchor.top
    if (Math.abs(delta) > 1) window.scrollBy({ top: delta, behavior: "instant" })
  }, [])

  const remaining = Math.max(0, feed.total - feed.items.length)
  // 12 grid tiles are whole rows at 2, 3, 4 and 6 columns (pages are 24).
  const skeletonCount = feed.status === "loading" ? Math.min(remaining || 1, layout === "grid" ? 12 : 4) : 0

  return (
    <div id={RESULTS_ID} className={RESULTS_WRAPPER_CLASS}>
      {/* Grid <-> list is a plain crossfade (90ms out, 90ms in), never a
          per-card layout animation: lists here run to hundreds of items. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.ul
          key={layout}
          ref={attachList}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.09, ease: EASE_OUT }}
          className={layout === "grid" ? PRODUCT_GRID_CLASS : PRODUCT_LIST_CLASS}
        >
          {feed.items.map((product) => (
            <ProductItem key={product.id} product={product} layout={layout} />
          ))}
          {Array.from({ length: skeletonCount }, (_, index) => (
            <li key={`skeleton-${index}`} aria-hidden="true" className="min-w-0">
              {layout === "grid" ? <ProductCardSkeleton className="h-full" /> : <ProductRowSkeleton />}
            </li>
          ))}
        </motion.ul>
      </AnimatePresence>

      <ResultsFooter feed={feed} sentinelRef={sentinelRef} />
    </div>
  )
}

/**
 * One result. Memoised: appending a page (and its loading/idle renders) must
 * not re-render the hundred-odd cards already on screen. Loaded items keep
 * their object identity across appends, so the shallow compare holds.
 */
const ProductItem = memo(function ProductItem({
  product,
  layout,
}: {
  product: ProductWithSupplier
  layout: ListingLayout
}) {
  return (
    <li data-id={product.id} className="min-w-0">
      {layout === "grid" ? (
        <MarketplaceProductCard product={product} className="h-full" />
      ) : (
        <ProductRow product={product} />
      )}
    </li>
  )
})

function findAnchor(list: HTMLElement | null): { id: string; top: number } | null {
  if (!list) return null
  // List top still on screen: nothing above it changes, no correction needed.
  if (list.getBoundingClientRect().top >= 0) return null
  for (const child of Array.from(list.children)) {
    const id = child instanceof HTMLElement ? child.dataset.id : undefined
    if (!id) continue
    const rect = child.getBoundingClientRect()
    // Skip items hidden under the sticky breadcrumb and toolbar.
    if (rect.bottom > 140) return { id, top: rect.top }
  }
  return null
}

// ─── Shared infinite-results machinery (also used by SupplierResults) ────────

/** The results wrapper; the toolbar sets aria-busy on it while new results render. */
export const RESULTS_ID = "category-results"
export const RESULTS_WRAPPER_CLASS =
  "transition-opacity duration-150 ease-(--ease-out) aria-busy:opacity-55"

const EASE_OUT = [0.23, 1, 0.32, 1] as const
const CSS_EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)"
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)"
/** Load the next page this far before the visitor reaches the end. */
const PRELOAD_MARGIN = "0px 0px 800px 0px"
/** After this many failed retries "Try again" stops intercepting and follows its `?page=` link. */
const MAX_SOFT_RETRIES = 2

export type ResultsNoun = { one: string; many: string }
const PRODUCT_NOUN: ResultsNoun = { one: "product", many: "products" }

type LoadTrigger = "auto" | "pointer" | "keyboard"

type FeedState<T> = {
  items: T[]
  /** Last page loaded. */
  page: number
  totalPages: number
  total: number
  status: "idle" | "loading" | "error"
  failures: number
  /** The most recent append, for its entrance (or focus, when asked for by keyboard). */
  batch: { id: number; start: number; count: number; how: LoadTrigger } | null
}

type FeedSnapshot<T> = Pick<FeedState<T>, "items" | "page" | "totalPages" | "total"> & {
  initialPage: number
  firstIds: string
  at: number
}

/**
 * Loaded pages per query, kept in memory for this tab only. Going back from a
 * product to the list remounts it; restoring what was loaded gives the
 * browser's scroll restoration (and the photo morph back into the list) the
 * same items to land on. Never written on the server, so hydration always
 * starts from the server page.
 */
const feedCache = new Map<string, FeedSnapshot<unknown>>()
const FEED_CACHE_TTL_MS = 10 * 60_000
const FEED_CACHE_MAX = 4

function firstIds(items: { id: string }[]) {
  return items
    .slice(0, 4)
    .map((item) => item.id)
    .join(",")
}

function restoreFeed<T extends { id: string }>(
  key: string,
  initial: Paginated<T>,
): FeedState<T> | null {
  if (typeof window === "undefined") return null
  const cached = feedCache.get(key) as FeedSnapshot<T> | undefined
  if (!cached) return null
  // Only when the server's first page is still the one the cache grew from.
  if (
    Date.now() - cached.at > FEED_CACHE_TTL_MS ||
    cached.initialPage !== (initial.meta.page || 1) ||
    cached.firstIds !== firstIds(initial.data)
  ) {
    feedCache.delete(key)
    return null
  }
  return { ...cached, status: "idle", failures: 0, batch: null }
}

function fromInitial<T>(initial: Paginated<T>): FeedState<T> {
  return {
    items: initial.data,
    page: initial.meta.page || 1,
    totalPages: initial.meta.totalPages,
    total: initial.meta.total,
    status: "idle",
    failures: 0,
    batch: null,
  }
}

/** Stable key for one query's list (and the page it starts on). */
export function feedKey(view: "products" | "suppliers", query: ResultsQuery, startPage: number) {
  return [view, query.category, query.sort ?? "", query.kind ?? "", query.search ?? "", startPage].join("|")
}

/** `nextHref` with its page number moved on, for the no-JS "Show more" link. */
function hrefForPage(nextHref: string, page: number) {
  const [path, search = ""] = nextHref.split("?")
  const params = new URLSearchParams(search)
  params.set("page", String(page))
  return `${path}?${params.toString()}`
}

export type ResultsFeed<T> = {
  noun: ResultsNoun
  items: T[]
  total: number
  status: FeedState<T>["status"]
  hasMore: boolean
  /** Pages shown, counting the server's. Above 1 the end of the list gets a note. */
  pagesLoaded: number
  /** The list began at `?page=n` (no-JS fallback), so earlier pages are not in it. */
  startedMidway: boolean
  moreHref: string | null
  softRetry: boolean
  announcement: string
  loadMore: (how: LoadTrigger) => void
}

/**
 * Infinite list state: appends pages from `load`, deduped by id, preloads via
 * an IntersectionObserver sentinel, animates each appended batch in, and keeps
 * an error state with retry. `listRef` must point at the <ul> of items and
 * `sentinelRef` is handed to <ResultsFooter> (refs stay with the caller so the
 * returned state is plain render data).
 */
export function useResultsFeed<T extends { id: string }>({
  initial,
  load,
  cacheKey,
  nextHref,
  listRef,
  sentinelRef,
  noun,
}: {
  initial: Paginated<T>
  load: (page: number) => Promise<Paginated<T>>
  cacheKey: string
  nextHref: string | null
  listRef: RefObject<HTMLUListElement | null>
  sentinelRef: RefObject<HTMLDivElement | null>
  noun: ResultsNoun
}): ResultsFeed<T> {
  const [state, setState] = useState<FeedState<T>>(
    () => restoreFeed(cacheKey, initial) ?? fromInitial(initial),
  )
  const inFlight = useRef(false)
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const { page, totalPages, status } = state
  const hasMore = page < totalPages

  const loadMore = useCallback(
    async (how: LoadTrigger) => {
      if (inFlight.current || !hasMore) return
      inFlight.current = true
      const nextPage = page + 1
      setState((prev) => ({ ...prev, status: "loading" }))
      try {
        const result = await load(nextPage)
        if (!alive.current) return
        setState((prev) => {
          const seen = new Set(prev.items.map((item) => item.id))
          const fresh = result.data.filter((item) => {
            if (seen.has(item.id)) return false
            seen.add(item.id)
            return true
          })
          return {
            items: fresh.length > 0 ? [...prev.items, ...fresh] : prev.items,
            page: nextPage,
            // An empty page means the list ended early (it shrank meanwhile).
            totalPages: result.data.length === 0 ? nextPage : Math.max(nextPage, result.meta.totalPages),
            total: result.meta.total,
            status: "idle",
            failures: 0,
            batch: { id: (prev.batch?.id ?? 0) + 1, start: prev.items.length, count: fresh.length, how },
          }
        })
      } catch {
        if (alive.current) {
          setState((prev) => ({ ...prev, status: "error", failures: prev.failures + 1 }))
        }
      } finally {
        inFlight.current = false
      }
    },
    [hasMore, page, load],
  )

  // Preload: watch a sentinel below the list. Re-created after every page, so
  // a short page that leaves the sentinel in range triggers the next load too.
  // Paused while loading and after an error (no silent retry loops), and while
  // the toolbar has the list aria-busy: a page fetched for the outgoing query
  // would be thrown away. When the flag clears (a cancelled navigation), the
  // sentinel is re-observed, which reports its position straight away.
  const canAutoLoad = status === "idle" && hasMore
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !canAutoLoad || typeof IntersectionObserver === "undefined") return
    const host = document.getElementById(RESULTS_ID)
    const busy = () => host?.getAttribute("aria-busy") === "true"
    const observer = new IntersectionObserver(
      (entries) => {
        if (busy()) return
        if (entries.some((entry) => entry.isIntersecting)) void loadMore("auto")
      },
      { rootMargin: PRELOAD_MARGIN },
    )
    observer.observe(sentinel)
    let watcher: MutationObserver | null = null
    if (host && typeof MutationObserver !== "undefined") {
      watcher = new MutationObserver(() => {
        if (busy()) return
        observer.unobserve(sentinel)
        observer.observe(sentinel)
      })
      watcher.observe(host, { attributes: true, attributeFilter: ["aria-busy"] })
    }
    return () => {
      observer.disconnect()
      watcher?.disconnect()
    }
  }, [canAutoLoad, loadMore, sentinelRef])

  // Entrance for each appended batch, before paint: fade + 8px rise, 220ms,
  // 40ms apart for the first 8 (the rest join the 8th). Reduced motion: a
  // short fade only. Keyboard-requested pages appear at once and take focus.
  const batch = state.batch
  useLayoutEffect(() => {
    const list = listRef.current
    if (!batch || !list || batch.count === 0) return
    const nodes = Array.from(list.children).slice(batch.start, batch.start + batch.count)
    if (batch.how === "keyboard") {
      nodes[0]?.querySelector<HTMLElement>("a[href], button")?.focus()
      return
    }
    const reduce = window.matchMedia(REDUCED_MOTION).matches
    nodes.forEach((node, index) => {
      if (!(node instanceof HTMLElement) || typeof node.animate !== "function") return
      node.animate(
        reduce
          ? [{ opacity: 0 }, { opacity: 1 }]
          : [
              { opacity: 0, transform: "translateY(8px)" },
              { opacity: 1, transform: "none" },
            ],
        {
          duration: reduce ? 150 : 220,
          delay: reduce ? 0 : Math.min(index, 7) * 40,
          easing: CSS_EASE_OUT,
          fill: "backwards",
        },
      )
    })
  }, [batch, listRef])

  // Remember loaded pages for this query (see feedCache).
  const initialPage = initial.meta.page || 1
  const initialIds = firstIds(initial.data)
  useEffect(() => {
    if (state.page <= initialPage) return
    feedCache.delete(cacheKey)
    feedCache.set(cacheKey, {
      items: state.items,
      page: state.page,
      totalPages: state.totalPages,
      total: state.total,
      initialPage,
      firstIds: initialIds,
      at: Date.now(),
    })
    while (feedCache.size > FEED_CACHE_MAX) {
      const oldest = feedCache.keys().next().value
      if (oldest === undefined) break
      feedCache.delete(oldest)
    }
  }, [cacheKey, initialPage, initialIds, state.items, state.page, state.totalPages, state.total])

  const total = Math.max(state.total, state.items.length)
  let announcement = ""
  if (status === "loading") announcement = `Loading more ${noun.many}`
  else if (status === "error") announcement = `Could not load more ${noun.many}.`
  else if (batch) announcement = `Showing ${state.items.length} of ${total} ${noun.many}.`

  return {
    noun,
    items: state.items,
    total,
    status,
    hasMore,
    pagesLoaded: page - initialPage + 1,
    startedMidway: initialPage > 1,
    moreHref: nextHref && hasMore ? (page === initialPage ? nextHref : hrefForPage(nextHref, page + 1)) : null,
    softRetry: state.failures < MAX_SOFT_RETRIES,
    announcement,
    loadMore,
  }
}

const FOOTER_BUTTON =
  "inline-flex min-h-11 min-w-44 items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-5 text-sm font-semibold text-ink-800 [-webkit-tap-highlight-color:transparent] transition-[background-color,border-color,scale,opacity] duration-140 ease-(--ease-out) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 active:scale-[0.97] aria-disabled:pointer-events-none aria-disabled:opacity-60 motion-reduce:active:scale-100 [@media(hover:hover)_and_(pointer:fine)]:hover:border-ink-300 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-ink-50"

/** New-tab / new-window gestures stay with the browser (the link opens `?page=n`). */
function isPlainClick(event: MouseEvent) {
  return !(
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
}

/** A click from Enter/Space reports no pointer presses. */
function trigger(event: MouseEvent): LoadTrigger {
  return event.detail === 0 ? "keyboard" : "pointer"
}

function backToTop(event: MouseEvent<HTMLButtonElement>) {
  const keyboard = event.detail === 0
  const instant = keyboard || window.matchMedia(REDUCED_MOTION).matches
  window.scrollTo({ top: 0, behavior: instant ? "instant" : "smooth" })
  if (!keyboard) return
  // Keyboard users continue from the top of the page, not from this button.
  const main = document.getElementById("main-content")
  if (!main) return
  if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1")
  main.focus({ preventScroll: true })
}

/**
 * Below the list: the preload sentinel, a screen-reader status, and one of
 * "Show more" (a real link JS takes over), an error with retry, or the end
 * note with "Back to top".
 */
export function ResultsFooter<T>({
  feed,
  sentinelRef,
}: {
  feed: ResultsFeed<T>
  sentinelRef: RefObject<HTMLDivElement | null>
}) {
  const { status, hasMore, moreHref, items, total, noun } = feed
  const loading = status === "loading"
  const count = (n: number) => `${n} ${n === 1 ? noun.one : noun.many}`

  const onMore = (event: MouseEvent<HTMLAnchorElement>) => {
    // Retries that keep failing fall through to the link: a full page load
    // of `?page=n` still works when the Server Function does not.
    if (!isPlainClick(event) || (status === "error" && !feed.softRetry)) return
    event.preventDefault()
    feed.loadMore(trigger(event))
  }

  let body = null
  if (status === "error") {
    body = (
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
          <CircleAlert aria-hidden="true" className="size-4 shrink-0 text-danger" />
          Could not load more {noun.many}
        </p>
        <p className="-mt-2 text-xs text-ink-500">Check your connection, then try again.</p>
        {moreHref ? (
          <Link href={moreHref} prefetch={false} onClick={onMore} className={FOOTER_BUTTON}>
            Try again
          </Link>
        ) : (
          <button type="button" onClick={(event) => feed.loadMore(trigger(event))} className={FOOTER_BUTTON}>
            Try again
          </button>
        )}
      </div>
    )
  } else if (hasMore) {
    body = (
      <div className="flex flex-col items-center gap-3">
        <p className="text-xs font-medium tabular-nums text-ink-500">
          Showing {items.length} of {count(total)}
        </p>
        {moreHref ? (
          <Link
            href={moreHref}
            prefetch={false}
            onClick={onMore}
            aria-disabled={loading || undefined}
            className={FOOTER_BUTTON}
          >
            {loading ? "Loading more…" : `Show more ${noun.many}`}
          </Link>
        ) : (
          <button
            type="button"
            onClick={(event) => feed.loadMore(trigger(event))}
            aria-disabled={loading || undefined}
            className={FOOTER_BUTTON}
          >
            {loading ? "Loading more…" : `Show more ${noun.many}`}
          </button>
        )}
      </div>
    )
  } else if (feed.pagesLoaded > 1) {
    body = (
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm font-semibold text-ink-700">
          {/* Started at ?page=n: the earlier pages were never shown, so no total. */}
          {feed.startedMidway ? "You’ve reached the end" : `You’ve seen all ${count(items.length)}`}
        </p>
        <button type="button" onClick={backToTop} className={FOOTER_BUTTON}>
          <ArrowUp aria-hidden="true" className="size-4" />
          Back to top
        </button>
      </div>
    )
  }

  return (
    <>
      <div ref={sentinelRef} aria-hidden="true" className="h-px" />
      <p role="status" className="sr-only">
        {feed.announcement}
      </p>
      {body ? <div className="mt-6 sm:mt-8">{body}</div> : null}
    </>
  )
}


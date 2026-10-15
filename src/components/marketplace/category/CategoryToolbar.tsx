"use client"

import {
  useEffect,
  useId,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  type ChangeEvent,
  type FormEvent,
  type MouseEvent,
} from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
import { LayoutGrid, List, Search, X } from "lucide-react"

import { FiltersControl, SortControl } from "@/components/marketplace/CategoryFilters"
import {
  SEARCH_MAX_LENGTH,
  listingHref,
  normalizeSearch,
  sortOptionsFor,
  type KindKey,
  type ListingView,
  type SortKey,
} from "@/components/marketplace/category-filters"
import { useListingLayout, type ListingLayout } from "@/hooks/use-listing-layout"
import { haptic } from "@/lib/celebrate"
import { springs } from "@/lib/motion"
import { cn } from "@/lib/utils"

/** Id of the results wrapper rendered by the result lists; it is dimmed while this toolbar's navigation is pending. */
const RESULTS_ID = "category-results"
/** Typing submits after this pause; Enter and the clear button submit at once. */
const SEARCH_DEBOUNCE_MS = 500

type ToolbarState = { view: ListingView; sort: SortKey; kind: KindKey; search: string }

type CategoryToolbarProps = {
  /** The category page path the new state is applied to. */
  basePath: string
  view: ListingView
  sort: SortKey
  kind: KindKey
  /** The `q` search text currently in the URL ("" when none). */
  search: string
  productTotal: number
  supplierTotal: number
  /** Names the search field ("Search in Beds"). */
  categoryName?: string
}

const subscribeNever = () => () => {}
/** False during server render and hydration, true afterwards. */
function useHydrated() {
  return useSyncExternalStore(subscribeNever, () => true, () => false)
}

/**
 * The category listing toolbar: Products / Sellers switch, search, sort,
 * filters and the grid/list toggle. The URL is the source of truth (the page is
 * server rendered), so every change is a `router` navigation inside a
 * transition. Controls reflect the choice at once (`useOptimistic`) while the
 * server answers; the result lists dim through `aria-busy` on `#category-results`.
 *
 * Layout contract: render it directly inside the page's `container-page`
 * section, not inside a short wrapper, because it is `position: sticky` and
 * bleeds to the container edges so its white backing meets the screen sides.
 * On phones the Products/Sellers row scrolls away and the search row stays;
 * the bar steps down under the marketplace breadcrumb whenever that returns.
 */
export function CategoryToolbar({
  basePath,
  view,
  sort,
  kind,
  search,
  productTotal,
  supplierTotal,
  categoryName,
}: CategoryToolbarProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const hydrated = useHydrated()
  const [layout, setLayout] = useListingLayout()
  const pillId = useId()

  const committed = useMemo<ToolbarState>(
    () => ({ view, sort, kind, search }),
    [view, sort, kind, search],
  )
  const [shown, setShown] = useOptimistic<ToolbarState, Partial<ToolbarState>>(
    committed,
    (current, patch) => ({ ...current, ...patch }),
  )

  const barRef = useRef<HTMLDivElement>(null)
  const anchorRef = useRef<HTMLDivElement>(null)

  /** Price sorts only exist for products: a state on Sellers falls back to newest. */
  function settle(state: ToolbarState): ToolbarState {
    return sortOptionsFor(state.view).some((option) => option.value === state.sort)
      ? state
      : { ...state, sort: "newest" }
  }

  /** Short URLs: defaults are left out, but the chosen view is kept whenever leaving it out could change what the page shows. */
  function hrefFor(raw: ToolbarState) {
    const state = settle(raw)
    const explicitView =
      state.view === "suppliers" ||
      state.search !== "" ||
      state.kind !== "all" ||
      productTotal === 0
    return listingHref(basePath, {
      view: explicitView ? state.view : undefined,
      sort: state.sort,
      kind: state.kind,
      search: state.search,
    })
  }

  function go(patch: Partial<ToolbarState>, options?: { replace?: boolean }) {
    const next = settle({ ...shown, ...patch })
    const href = hrefFor(next)
    // Compared with what is on screen, so undoing a change still in flight navigates back.
    if (href === hrefFor(shown)) return

    // A new result set starts at its top. When the bar is stuck the visitor is
    // deep in the old list, so bring them back to the top of the results.
    if (barRef.current?.dataset.stuck === "true") {
      anchorRef.current?.scrollIntoView({ block: "start", behavior: "instant" })
    }

    startTransition(() => {
      setShown(next)
      if (options?.replace) router.replace(href, { scroll: false })
      else router.push(href, { scroll: false })
    })
  }

  // Dim the results while the server renders the new ones. The result lists own
  // the dimming style; this only flips the flag they key on.
  useEffect(() => {
    if (!pending) return
    const results = document.getElementById(RESULTS_ID)
    if (!results) return
    results.setAttribute("aria-busy", "true")
    return () => results.setAttribute("aria-busy", "false")
  }, [pending])

  // Stuck state (white backing + hairline) is written straight to the DOM from
  // a throttled scroll read, like AutoHideHeader, so scrolling never re-renders.
  useEffect(() => {
    const bar = barRef.current
    if (!bar) return
    let frame = 0
    const measure = () => {
      frame = 0
      const top = parseFloat(getComputedStyle(bar).top) || 0
      const stuck = window.scrollY > 0 && bar.getBoundingClientRect().top <= top + 0.5
      if (bar.dataset.stuck !== String(stuck)) bar.dataset.stuck = String(stuck)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }
    measure()
    window.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", schedule, { passive: true })
    return () => {
      window.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", schedule)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  /* ── Search ─────────────────────────────────────────────────────────────── */

  const inputRef = useRef<HTMLInputElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [text, setText] = useState(search)
  // The last value we asked the URL for, and the last `search` prop we looked at.
  const [submitted, setSubmitted] = useState(search)
  const [seenSearch, setSeenSearch] = useState(search)

  // The URL changed from outside (e.g. "Clear filters" in an empty state): show
  // it. Our own submissions are skipped so typing is never overwritten mid-way.
  if (search !== seenSearch) {
    setSeenSearch(search)
    if (!pending && search !== submitted) {
      setText(search)
      setSubmitted(search)
    }
  }

  function commitSearch(raw: string, replace: boolean) {
    const normalized = normalizeSearch(raw)
    if (normalized === submitted) return
    setSubmitted(normalized)
    // Typing-as-you-go replaces the entry so Back is not a stack of half-typed words.
    go({ search: normalized }, { replace })
  }

  // The debounce callback must see the latest state, not the render it was created in.
  const commitRef = useRef(commitSearch)
  useEffect(() => {
    commitRef.current = commitSearch
  })
  useEffect(() => () => clearTimeout(timer.current), [])

  function onSearchChange(e: ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setText(value)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => commitRef.current(value, true), SEARCH_DEBOUNCE_MS)
  }

  function onSearchSubmit(e: FormEvent) {
    e.preventDefault()
    clearTimeout(timer.current)
    commitSearch(text, false)
    // Put the results, not the keyboard, on screen on touch devices.
    if (window.matchMedia("(pointer: coarse)").matches) inputRef.current?.blur()
  }

  function clearSearch() {
    clearTimeout(timer.current)
    setText("")
    commitSearch("", false)
    inputRef.current?.focus()
  }

  /* ── Products / Sellers ─────────────────────────────────────────────────── */

  function onSegmentClick(e: MouseEvent<HTMLAnchorElement>, next: ListingView) {
    // Let the browser handle new-tab / new-window gestures.
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return
    }
    e.preventDefault()
    if (next === shown.view) return
    haptic("tap")
    go({ view: next })
  }

  const segments: { view: ListingView; label: string; count: number }[] = [
    { view: "products", label: "Products", count: productTotal },
    { view: "suppliers", label: "Sellers", count: supplierTotal },
  ]
  const activeTotal = shown.view === "products" ? productTotal : supplierTotal

  const hasText = text.length > 0

  return (
    <>
      {/* Where the bar naturally sits; scrolled to when a change resets the results. */}
      <div ref={anchorRef} aria-hidden="true" className="h-0 scroll-mt-13 sm:scroll-mt-0" />

      <div
        ref={barRef}
        data-stuck="false"
        className={cn(
          "group/toolbar sticky z-20 -mx-4 flex flex-col gap-2 border-b border-transparent bg-white/95 px-4 py-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8",
          // Phones: park the Products/Sellers row (44px + 8px padding) above the screen. From md it is one row.
          "-top-13 md:top-0 md:flex-row md:items-center md:gap-3",
          // Under the sticky marketplace breadcrumb whenever it is showing (below sm; from sm it scrolls with the page).
          "max-sm:[body:has(.autohide[data-edge=top][data-hidden=false])_&]:top-0",
          "transition-[top,border-color] duration-300 ease-(--ease-drawer) data-[stuck=true]:border-ink-200",
          "motion-reduce:transition-[border-color] motion-reduce:duration-150",
        )}
      >
        <nav
          aria-label="Listing type"
          className={cn(
            "grid shrink-0 grid-cols-2 rounded-full bg-ink-100 md:w-72",
            // Once stuck on a phone this row is off-screen or under the breadcrumb: keep it from showing through.
            "transition-opacity duration-160 ease-(--ease-out) group-data-[stuck=true]/toolbar:max-md:opacity-0",
          )}
        >
          {segments.map((segment) => {
            const active = shown.view === segment.view
            return (
              <Link
                key={segment.view}
                href={hrefFor({ ...shown, view: segment.view })}
                aria-current={active ? "page" : undefined}
                onClick={(e) => onSegmentClick(e, segment.view)}
                className={cn(
                  "relative flex h-11 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-[color,scale] duration-140 ease-(--ease-out) active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 motion-reduce:active:scale-100",
                  active ? "text-brand-800" : "text-ink-600 hover:text-ink-900",
                )}
              >
                {active ? <Pill layoutId={`${pillId}-view`} /> : null}
                <span className="relative">{segment.label}</span>
                <span
                  className={cn(
                    "relative tabular-nums transition-colors duration-160 ease-(--ease-out)",
                    active ? "text-brand-700" : "text-ink-500",
                  )}
                >
                  {segment.count.toLocaleString("en-US")}
                </span>
              </Link>
            )
          })}
        </nav>

        <div className="flex min-w-0 items-center gap-2 md:flex-1">
          <form role="search" onSubmit={onSearchSubmit} className="relative min-w-0 flex-1 md:max-w-md">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-500"
            />
            <input
              ref={inputRef}
              type="search"
              name="q"
              value={text}
              onChange={onSearchChange}
              maxLength={SEARCH_MAX_LENGTH}
              placeholder={categoryName ? `Search in ${categoryName}` : "Search this category"}
              aria-label={categoryName ? `Search in ${categoryName}` : "Search this category"}
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              // 16px on phones: smaller text makes iOS zoom the page on focus.
              className="h-11 w-full min-w-0 appearance-none truncate rounded-full border border-ink-200 bg-white pl-10 pr-11 text-base text-ink-900 outline-none transition-[border-color,box-shadow] duration-160 ease-(--ease-out) placeholder:text-ink-500 hover:border-ink-300 focus-visible:border-brand-600 focus-visible:shadow-[0_0_0_3px_color-mix(in_oklch,var(--color-brand-500)_28%,transparent)] md:text-sm [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
            />
            <button
              type="button"
              onClick={clearSearch}
              tabIndex={hasText ? 0 : -1}
              aria-hidden={hasText ? undefined : true}
              aria-label="Clear search"
              className={cn(
                "absolute right-0 top-0 grid size-11 place-items-center rounded-full text-ink-500 transition-[opacity,scale,color] duration-160 ease-(--ease-out) hover:text-ink-900 active:scale-[0.97] focus-visible:outline-2 -outline-offset-2 focus-visible:outline-brand-500 motion-reduce:scale-100 motion-reduce:active:scale-100",
                hasText ? "opacity-100" : "pointer-events-none scale-95 opacity-0",
              )}
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </form>

          <SortControl
            view={shown.view}
            sort={shown.sort}
            onChange={(next) => go({ sort: next })}
          />
          <FiltersControl
            view={shown.view}
            kind={shown.kind}
            // While a change is in flight the count on screen belongs to the old filters.
            total={pending ? null : activeTotal}
            onApply={(next) => go({ kind: next })}
          />
          {shown.view === "products" ? (
            <LayoutToggle
              layout={layout}
              onChange={setLayout}
              animated={hydrated}
              pillId={`${pillId}-layout`}
            />
          ) : null}
        </div>

        <p role="status" className="sr-only">
          {pending ? "Updating results" : ""}
        </p>
      </div>
    </>
  )
}

/** The sliding selection behind the active segment. Equal-width segments, so it only ever translates. */
function Pill({ layoutId }: { layoutId: string }) {
  return (
    <motion.span
      layoutId={layoutId}
      transition={springs.snappy}
      className="absolute inset-[3px] rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/0.14),0_0_0_1px_rgb(0_0_0/0.04)]"
    />
  )
}

const LAYOUT_CHOICES: { value: ListingLayout; label: string; Icon: typeof LayoutGrid }[] = [
  { value: "grid", label: "Grid view", Icon: LayoutGrid },
  { value: "list", label: "List view", Icon: List },
]

function LayoutToggle({
  layout,
  onChange,
  animated,
  pillId,
}: {
  layout: ListingLayout
  onChange: (layout: ListingLayout) => void
  /** Off until hydrated: a stored "list" choice must appear in place, not slide in from "grid". */
  animated: boolean
  pillId: string
}) {
  return (
    <div role="group" aria-label="Layout" className="relative flex shrink-0 rounded-full bg-ink-100">
      {LAYOUT_CHOICES.map(({ value, label, Icon }) => {
        const active = layout === value
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            aria-label={label}
            onClick={() => {
              if (active) return
              haptic("tap")
              onChange(value)
            }}
            className={cn(
              "relative grid size-11 place-items-center rounded-full transition-[color,scale] duration-140 ease-(--ease-out) active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 motion-reduce:active:scale-100",
              active ? "text-brand-800" : "text-ink-500 hover:text-ink-900",
            )}
          >
            {active ? (
              animated ? (
                <Pill layoutId={pillId} />
              ) : (
                <span className="absolute inset-[3px] rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/0.14),0_0_0_1px_rgb(0_0_0/0.04)]" />
              )
            ) : null}
            <Icon aria-hidden="true" className="relative size-[1.125rem]" />
          </button>
        )
      })}
    </div>
  )
}

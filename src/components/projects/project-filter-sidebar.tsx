"use client"

import { useEffect, useRef, useState } from "react"
import { SlidersHorizontal, RotateCcw, Search, Star, Eye } from "lucide-react"
import { GlassSheet } from "@/components/common/glass-sheet"
import { useDebounce } from "@/hooks/use-debounce"
import { useProjectFilters } from "@/hooks/use-project-filters"
import { PROJECT_VIEW_OPTIONS } from "@/lib/project-views"
import { cn } from "@/lib/utils"

const PRICE_PRESETS = [
  { label: "Any", min: undefined, max: undefined },
  { label: "Under ৳50L", min: undefined, max: 5_000_000 },
  { label: "৳50L-1Cr", min: 5_000_000, max: 10_000_000 },
  { label: "৳1Cr+", min: 10_000_000, max: undefined },
] as const

const SORT_OPTIONS = [
  { label: "Newest", value: "" },
  { label: "Price: low to high", value: "priceFrom:asc" },
  { label: "Price: high to low", value: "priceFrom:desc" },
  { label: "Name A-Z", value: "name:asc" },
] as const

type Filters = ReturnType<typeof useProjectFilters>["filters"]
type SetFilter = ReturnType<typeof useProjectFilters>["setFilter"]
type SetFilters = ReturnType<typeof useProjectFilters>["setFilters"]

const labelClass =
  "mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
const selectClass =
  "w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-400"

/**
 * The filter fields, rendered once in the phone sheet and once in the desktop
 * sidebar. `idPrefix` keeps ids unique while both are in the DOM; the search
 * draft lives in the parent so the two copies never disagree.
 */
function FilterFields({
  idPrefix,
  filters,
  draft,
  onDraft,
  setFilter,
  setFilters,
}: {
  idPrefix: string
  filters: Filters
  draft: string
  onDraft: (value: string) => void
  setFilter: SetFilter
  setFilters: SetFilters
}) {
  return (
    <div className="space-y-4 lg:space-y-5">
      <div>
        <label htmlFor={`${idPrefix}-search`} className={cn(labelClass, "block")}>
          Name or location
        </label>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-1.5 lg:py-2">
          <Search aria-hidden="true" className="size-4 shrink-0 text-brand-600" />
          <input
            id={`${idPrefix}-search`}
            name="search"
            type="search"
            value={draft}
            onChange={(e) => onDraft(e.target.value)}
            placeholder="Gulshan, Alivia Heights…"
            autoComplete="off"
            spellCheck={false}
            className="w-full bg-transparent py-1 text-sm text-ink-700 outline-none placeholder:text-ink-400"
          />
        </div>
      </div>

      <div>
        <p className={labelClass}>Starting price</p>
        <div className="grid grid-cols-2 gap-1.5 lg:gap-2">
          {PRICE_PRESETS.map((preset) => {
            const active = filters.minPrice === preset.min && filters.maxPrice === preset.max
            return (
              <button
                key={preset.label}
                type="button"
                aria-pressed={active}
                onClick={() => setFilters({ minPrice: preset.min, maxPrice: preset.max })}
                className="glass-chip !justify-center !px-2 !text-xs lg:!min-h-10"
              >
                {preset.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:block lg:space-y-5">
        <div>
          <label htmlFor={`${idPrefix}-view`} className={labelClass}>
            <Eye aria-hidden="true" className="size-3.5 text-brand-600" />
            View
          </label>
          <select
            id={`${idPrefix}-view`}
            name="view"
            value={filters.view ?? ""}
            onChange={(e) => setFilter("view", e.target.value || undefined)}
            className={selectClass}
          >
            <option value="">Any view</option>
            {PROJECT_VIEW_OPTIONS.map((view) => (
              <option key={view} value={view}>
                {view}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={`${idPrefix}-sort`} className={labelClass}>
            Sort by
          </label>
          <select
            id={`${idPrefix}-sort`}
            name="sort"
            value={filters.sort ?? ""}
            onChange={(e) => setFilter("sort", e.target.value || undefined)}
            className={selectClass}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.label} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-white px-3 py-2.5">
        <input
          type="checkbox"
          name="featured"
          checked={!!filters.featured}
          onChange={(e) => setFilter("featured", e.target.checked || undefined)}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className="flex size-5 shrink-0 items-center justify-center rounded-md border border-ink-300 bg-white transition-colors peer-checked:border-brand-700 peer-checked:bg-brand-700 peer-checked:[&_span]:opacity-100 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-300"
        >
          <span className="size-2 rounded-sm bg-white opacity-0 transition-opacity" />
        </span>
        <Star aria-hidden="true" className="size-4 text-brand-600" />
        <span className="text-sm font-medium">Flagship apartments only</span>
      </label>
    </div>
  )
}

export function ProjectFilterSidebar() {
  const { filters, setFilter, setFilters, resetFilters } = useProjectFilters()
  const [open, setOpen] = useState(false)

  const activeCount = [
    filters.search,
    filters.minPrice,
    filters.maxPrice,
    filters.featured,
    filters.sort,
    filters.view,
  ].filter(Boolean).length

  // Typing must not navigate on every keystroke (each push re-renders the page
  // on the server): keep a draft and commit it once the user pauses.
  const [draft, setDraft] = useState(filters.search ?? "")
  const debouncedDraft = useDebounce(draft, 450)
  const committed = useRef(filters.search ?? "")
  useEffect(() => {
    if (debouncedDraft === committed.current) return
    committed.current = debouncedDraft
    setFilter("search", debouncedDraft || undefined)
  }, [debouncedDraft, setFilter])

  function reset() {
    setDraft("")
    committed.current = ""
    resetFilters()
  }

  return (
    <>
      {/* Phones and tablets: one slim glass bar; the form opens in a bottom sheet
          so the apartments stay the first thing on the page. */}
      <div className="flex items-center gap-2 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          className="btn-glass min-h-10 flex-1 justify-start"
        >
          <SlidersHorizontal aria-hidden="true" className="size-4 text-brand-600" />
          Filters
          {activeCount > 0 && (
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-brand-700 px-1.5 py-0.5 text-[0.65rem] font-bold leading-none text-white">
              {activeCount}
            </span>
          )}
        </button>
        {activeCount > 0 && (
          <button type="button" onClick={reset} className="btn-glass min-h-10">
            <RotateCcw aria-hidden="true" className="size-3.5" />
            Reset
          </button>
        )}
      </div>

      <GlassSheet
        open={open}
        onOpenChange={setOpen}
        title="Filters"
        description={activeCount > 0 ? `${activeCount} active` : "Refine the apartments"}
        footer={
          <div className="flex items-center gap-2">
            {activeCount > 0 && (
              <button type="button" onClick={reset} className="btn-glass shrink-0">
                Reset
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn-tactile btn-tactile--block flex-1"
            >
              Show apartments
            </button>
          </div>
        }
      >
        <FilterFields
          idPrefix="m"
          filters={filters}
          draft={draft}
          onDraft={setDraft}
          setFilter={setFilter}
          setFilters={setFilters}
        />
      </GlassSheet>

      {/* Desktop: the sticky sidebar. */}
      <aside className="surface-panel hidden space-y-5 p-5 lg:sticky lg:top-24 lg:block">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <SlidersHorizontal aria-hidden="true" className="size-4 text-brand-600" />
              Filters
            </h2>
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ink-500">
              {activeCount} active
            </p>
          </div>
          <button
            type="button"
            onClick={reset}
            className="flex shrink-0 cursor-pointer items-center gap-1 text-xs text-brand-700 hover:underline"
          >
            <RotateCcw aria-hidden="true" className="size-3" /> Reset
          </button>
        </div>

        <FilterFields
          idPrefix="d"
          filters={filters}
          draft={draft}
          onDraft={setDraft}
          setFilter={setFilter}
          setFilters={setFilters}
        />
      </aside>
    </>
  )
}

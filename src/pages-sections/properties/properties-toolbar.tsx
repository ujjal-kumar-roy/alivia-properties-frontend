"use client"

import { useCallback, useState, type ReactNode } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { motion } from "motion/react"
import { ArrowUpDown, Check, LayoutGrid, List, RotateCcw, SlidersHorizontal } from "lucide-react"
import { GlassSheet } from "@/components/common/glass-sheet"
import { FilterFields, countActiveFilters, useAreaDraft } from "@/components/properties/filter-sidebar"
import { haptic } from "@/lib/celebrate"
import { springs } from "@/lib/motion"
import { cn } from "@/lib/utils"

const SORT_OPTIONS = [
  { value: "", label: "Newest first", short: "Newest" },
  { value: "price-asc", label: "Price: low to high", short: "Price low" },
  { value: "price-desc", label: "Price: high to low", short: "Price high" },
  { value: "size-desc", label: "Largest first", short: "Largest" },
]

/**
 * One result slot. The server page owns the data and the cards; this thin
 * client wrapper only exists so each slot can animate its layout. `layout="position"` glides it to its new spot when the grid
 * switches to the list view or the filters reorder the results, without
 * stretching the card's photo mid-flight. Entry is left to the `.reveal` inside.
 */
export function PropertyResultsItem({ children }: { children: ReactNode }) {
  return (
    <motion.div layout="position" transition={springs.move} className="min-w-0">
      {children}
    </motion.div>
  )
}

export function PropertiesToolbar({ total }: { total: number }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const view = searchParams.get("view") ?? "grid"
  const sortBy = searchParams.get("sortBy") ?? ""
  const { filters, draft, onDraft, reset } = useAreaDraft()
  const activeCount = countActiveFilters(filters)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const currentSort = SORT_OPTIONS.find((o) => o.value === sortBy) ?? SORT_OPTIONS[0]

  const push = useCallback(
    (patch: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(patch)) {
        if (value) params.set(key, value)
        else params.delete(key)
      }
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams],
  )

  // A new order starts again from the first page, like every filter change does.
  const setSort = (value: string) => push({ sortBy: value, page: "" })

  const filtersButton = (extra?: string) => (
    <button
      type="button"
      onClick={() => setFiltersOpen(true)}
      aria-haspopup="dialog"
      className={cn("btn-glass min-h-10", extra)}
    >
      <SlidersHorizontal aria-hidden="true" className="size-4 text-brand-600" />
      Filters
      {activeCount > 0 && (
        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-brand-700 px-1.5 py-0.5 text-[0.6875rem] font-bold leading-none text-white">
          {activeCount}
        </span>
      )}
    </button>
  )

  return (
    <>
      {/* Phones: one slim row of two glass buttons. The count lives in the page header. */}
      <div className="flex items-center gap-2 sm:hidden">
        {filtersButton("flex-1")}
        <button
          type="button"
          onClick={() => setSortOpen(true)}
          aria-haspopup="dialog"
          aria-label={`Sort: ${currentSort.label}`}
          className="btn-glass min-h-10 flex-1"
        >
          <ArrowUpDown aria-hidden="true" className="size-4 text-brand-600" />
          <span className="text-ink-500">Sort</span>
          {currentSort.short}
        </button>
      </div>

      {/* Tablet and up: the original bar, plus Filters until the sidebar appears at lg. */}
      <div className="hidden flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-white px-4 py-2.5 sm:flex">
        <p className="text-sm text-ink-500">
          <span className="font-semibold text-ink-900">{total.toLocaleString()}</span> listings found
        </p>
        <div className="flex items-center gap-2">
          {filtersButton("lg:hidden")}
          <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
            {(
              [
                { id: "grid", label: "Grid view", Icon: LayoutGrid },
                { id: "list", label: "List view", Icon: List },
              ] as const
            ).map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  if (view === id) return
                  haptic("tap")
                  push({ view: id })
                }}
                aria-label={label}
                aria-pressed={view === id}
                className={cn(
                  "relative flex size-8 items-center justify-center rounded-md transition-colors active:scale-90 motion-reduce:active:scale-100",
                  view === id ? "text-white" : "text-ink-500 hover:text-ink-800",
                )}
              >
                {view === id && (
                  <motion.span
                    layoutId="properties-view-pill"
                    transition={springs.move}
                    className="absolute inset-0 rounded-md bg-brand-600"
                  />
                )}
                <Icon aria-hidden="true" className="relative z-10 h-3.5 w-3.5" />
              </button>
            ))}
          </div>

          <div className="relative flex items-center gap-1.5 rounded-lg border border-border pl-2.5 pr-1 text-xs text-ink-700">
            <ArrowUpDown aria-hidden="true" className="h-3.5 w-3.5 text-ink-400" />
            <select
              value={sortBy}
              onChange={(e) => setSort(e.target.value)}
              aria-label="Sort listings"
              className="min-h-9 cursor-pointer appearance-none bg-transparent pr-2 text-xs text-ink-800 outline-none"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <GlassSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        title="Filters"
        description={activeCount > 0 ? `${activeCount} active` : "Refine the listings"}
        footer={
          <div className="flex items-center gap-2">
            {activeCount > 0 && (
              <button type="button" onClick={reset} className="btn-glass shrink-0">
                <RotateCcw aria-hidden="true" className="size-3.5" />
                Reset
              </button>
            )}
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              className="btn-tactile flex-1"
            >
              {total > 0
                ? `Show ${total.toLocaleString("en-BD")} listing${total === 1 ? "" : "s"}`
                : "Show results"}
            </button>
          </div>
        }
      >
        <FilterFields idPrefix="sheet" draft={draft} onDraft={onDraft} />
      </GlassSheet>

      <GlassSheet
        open={sortOpen}
        onOpenChange={setSortOpen}
        title="Sort by"
        description={`${total.toLocaleString("en-BD")} listing${total === 1 ? "" : "s"}`}
      >
        <div role="radiogroup" aria-label="Sort listings" className="grid gap-2 pb-1">
          {SORT_OPTIONS.map((o) => {
            const selected = o.value === sortBy
            return (
              <button
                key={o.label}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => {
                  haptic("tap")
                  setSort(o.value)
                  setSortOpen(false)
                }}
                className="choice-card"
              >
                <span className="flex-1">{o.label}</span>
                {selected && <Check aria-hidden="true" className="size-5 text-brand-600" />}
              </button>
            )
          })}
        </div>
      </GlassSheet>
    </>
  )
}

"use client"

import { useEffect, useRef, useState } from "react"
import { SlidersHorizontal, RotateCcw, MapPin, BadgeCheck } from "lucide-react"
import { usePropertyFilters } from "@/hooks/use-property-filters"
import { PROPERTY_TYPE_OPTIONS } from "@/data/property-types"
import { BD_DIVISIONS } from "@/data/locations.bd"
import type { PropertyType, PropertyPurpose, PropertyQueryParams } from "@/types/property.types"

const PRICE_PRESETS = [
  { label: "Any", min: undefined, max: undefined },
  { label: "Under ৳80L", min: undefined, max: 8_000_000 },
  { label: "৳80L-1.5Cr", min: 8_000_000, max: 15_000_000 },
  { label: "৳1.5Cr+", min: 15_000_000, max: undefined },
] as const

const labelClass =
  "mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
const selectClass =
  "w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-400"

/** How many filters are applied; the "Filters (n)" badge and the sidebar header both use it. */
export function countActiveFilters(filters: PropertyQueryParams): number {
  return [
    filters.search,
    filters.purpose,
    filters.type,
    filters.division,
    filters.district,
    filters.area,
    filters.minPrice,
    filters.maxPrice,
    filters.bedrooms,
    filters.verified,
  ].filter(Boolean).length
}

/**
 * The area box is typed into, so it must not navigate on every keystroke (each
 * push re-renders the listing on the server). The draft is committed to the
 * URL once the visitor pauses, and a URL change made elsewhere (reset, a
 * removed filter pill) is adopted instead of being overwritten by a stale draft.
 */
export function useAreaDraft() {
  const { filters, setFilter, resetFilters } = usePropertyFilters()
  const urlArea = filters.area ?? ""
  const [draft, setDraft] = useState(urlArea)
  const [committed, setCommitted] = useState(urlArea)
  const [seenUrl, setSeenUrl] = useState(urlArea)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestSetFilter = useRef(setFilter)

  useEffect(() => {
    latestSetFilter.current = setFilter
  })
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  // Derived state: only a URL change we did not commit ourselves replaces the draft.
  if (urlArea !== seenUrl) {
    setSeenUrl(urlArea)
    if (urlArea !== committed) {
      setCommitted(urlArea)
      setDraft(urlArea)
    }
  }

  function onDraft(value: string) {
    setDraft(value)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      setCommitted(value)
      latestSetFilter.current("area", value || undefined)
    }, 450)
  }

  function reset() {
    if (timer.current) clearTimeout(timer.current)
    setDraft("")
    setCommitted("")
    resetFilters()
  }

  return { filters, draft, onDraft, reset }
}

/**
 * The filter form, rendered once in the phone/tablet sheet and once in the
 * desktop sidebar. `idPrefix` keeps ids unique if both are ever mounted.
 * Every control writes straight to the URL, exactly as the sidebar always has.
 */
export function FilterFields({
  idPrefix,
  draft,
  onDraft,
}: {
  idPrefix: string
  draft: string
  onDraft: (value: string) => void
}) {
  const { filters, setFilter, setFilters } = usePropertyFilters()
  const divisions = BD_DIVISIONS.map((d) => d.name)
  const districts =
    BD_DIVISIONS.find((d) => d.name === filters.division)?.districts.map((d) => d.name) ?? []

  return (
    <div className="space-y-4 lg:space-y-5">
      <div>
        <label htmlFor={`${idPrefix}-area`} className={labelClass}>
          Area or keyword
        </label>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-1.5 lg:py-2">
          <MapPin aria-hidden="true" className="size-4 shrink-0 text-brand-600" />
          <input
            id={`${idPrefix}-area`}
            name="area"
            value={draft}
            onChange={(e) => onDraft(e.target.value)}
            placeholder="Bashundhara R/A…"
            autoComplete="off"
            spellCheck={false}
            className="w-full bg-transparent py-1 text-sm text-ink-700 outline-none placeholder:text-ink-400"
          />
        </div>
      </div>

      <div>
        <p className={labelClass}>Purpose</p>
        <div className="grid grid-cols-2 gap-1.5">
          {(["sale", "rent"] as PropertyPurpose[]).map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={filters.purpose === p}
              onClick={() => setFilter("purpose", filters.purpose === p ? undefined : p)}
              className="glass-chip !justify-center lg:!min-h-10"
            >
              {p === "sale" ? "Buy" : "Rent"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className={labelClass}>Price range</p>
        <div className="grid grid-cols-2 gap-1.5">
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

      <div>
        <p className={labelClass}>Property type</p>
        <div className="flex flex-wrap gap-1.5">
          {PROPERTY_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              aria-pressed={filters.type === opt.value}
              onClick={() =>
                setFilter("type", filters.type === opt.value ? undefined : (opt.value as PropertyType))
              }
              className="glass-chip lg:!min-h-10"
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className={districts.length > 0 ? "grid grid-cols-2 gap-3 lg:block lg:space-y-5" : ""}>
        <div>
          <label htmlFor={`${idPrefix}-division`} className={labelClass}>
            Division
          </label>
          <select
            id={`${idPrefix}-division`}
            name="division"
            value={filters.division ?? ""}
            onChange={(e) => setFilters({ division: e.target.value || undefined, district: undefined })}
            className={selectClass}
          >
            <option value="">All Divisions</option>
            {divisions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {districts.length > 0 && (
          <div>
            <label htmlFor={`${idPrefix}-district`} className={labelClass}>
              District
            </label>
            <select
              id={`${idPrefix}-district`}
              name="district"
              value={filters.district ?? ""}
              onChange={(e) => setFilter("district", e.target.value || undefined)}
              className={selectClass}
            >
              <option value="">All Districts</option>
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div>
        <p className={labelClass}>Bedrooms</p>
        <div className="grid grid-cols-5 gap-1.5">
          {["1", "2", "3", "4", "5+"].map((b) => {
            const parsed = Number(b.replace("+", ""))
            return (
              <button
                key={b}
                type="button"
                aria-pressed={filters.bedrooms === parsed}
                onClick={() => setFilter("bedrooms", filters.bedrooms === parsed ? undefined : parsed)}
                className="glass-chip !justify-center !px-0 lg:!min-h-10"
              >
                {b}
              </button>
            )
          })}
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-white px-3 py-2.5">
        <input
          type="checkbox"
          name="verified"
          checked={!!filters.verified}
          onChange={(e) => setFilter("verified", e.target.checked || undefined)}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className="flex size-5 shrink-0 items-center justify-center rounded-md border border-ink-300 bg-white transition-colors peer-checked:border-brand-700 peer-checked:bg-brand-700 peer-checked:[&_span]:opacity-100 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-300"
        >
          <span className="size-2 rounded-sm bg-white opacity-0 transition-opacity" />
        </span>
        <BadgeCheck aria-hidden="true" className="size-4 text-brand-600" />
        <span className="text-sm font-medium">Verified listings only</span>
      </label>
    </div>
  )
}

/**
 * The sticky filter panel for desktop (lg and up). Below lg the same form
 * opens in a bottom sheet from the toolbar, so this panel is hidden there.
 */
export function FilterSidebar() {
  const { filters, draft, onDraft, reset } = useAreaDraft()
  const activeCount = countActiveFilters(filters)

  return (
    <aside className="surface-panel hidden space-y-5 p-5 lg:sticky lg:top-24 lg:block">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold">
            <SlidersHorizontal aria-hidden="true" className="size-4 text-brand-600" />
            Filters
          </h3>
          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ink-500">
            {activeCount} active
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="flex min-h-8 shrink-0 cursor-pointer items-center gap-1 text-xs text-brand-700 hover:underline"
        >
          <RotateCcw aria-hidden="true" className="size-3" /> Reset
        </button>
      </div>

      <div className="rounded-[1.25rem] border border-brand-100 bg-brand-50/70 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">
          Quick guidance
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-600">
          Filters update the results as you choose them.
        </p>
      </div>

      <FilterFields idPrefix="side" draft={draft} onDraft={onDraft} />
    </aside>
  )
}

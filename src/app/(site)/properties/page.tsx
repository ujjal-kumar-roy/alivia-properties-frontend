export const dynamic = "force-dynamic"

import { Suspense } from "react"
import Link from "next/link"
import { getProperties } from "@/services/properties.service"
import { PropertyCard } from "@/components/properties/property-card"
import { FilterSidebar } from "@/components/properties/filter-sidebar"
import { EmptyState } from "@/components/common/empty-state"
import { Home, X } from "lucide-react"
import { PropertiesToolbar, PropertyResultsItem } from "@/pages-sections/properties/properties-toolbar"
import { CompareFloatBar } from "@/components/properties/compare-float-bar"
import { PropertyPagination } from "@/pages-sections/properties/property-pagination"
import { RecentSearchRecorder } from "@/components/properties/recent-search-recorder"
import { PROPERTY_TYPE_OPTIONS } from "@/data/property-types"
import { ROUTES } from "@/config/routes.config"
import { formatPrice } from "@/utils/format-price"
import type { PropertyQueryParams } from "@/types/property.types"

interface PropertiesPageProps {
  searchParams: Promise<Record<string, string>>
}

// The toolbar's `sortBy` values are not what the API reads: it orders by
// `sort=field:direction`, so translate them here (an unknown value sorts newest first).
const SORT_PARAM: Record<string, string> = {
  "price-asc": "price:asc",
  "price-desc": "price:desc",
  "size-desc": "size:desc",
}

const PURPOSE_CHIPS = [
  { label: "All", value: undefined },
  { label: "Buy", value: "sale" },
  { label: "Rent", value: "rent" },
] as const

/** The listing URL with `patch` applied (undefined removes a key); filter changes restart at page 1. */
function hrefWith(params: Record<string, string>, patch: Record<string, string | undefined>) {
  const next = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) if (value) next.set(key, value)
  for (const [key, value] of Object.entries(patch)) {
    if (value) next.set(key, value)
    else next.delete(key)
  }
  next.set("page", "1")
  return `${ROUTES.PROPERTIES}?${next.toString()}`
}

function priceTag(min?: string, max?: string): string | null {
  const lo = min ? Number(min) : undefined
  const hi = max ? Number(max) : undefined
  if (lo && hi) return `Price: ${formatPrice(lo, true)} to ${formatPrice(hi, true)}`
  if (hi) return `Price: under ${formatPrice(hi, true)}`
  if (lo) return `Price: ${formatPrice(lo, true)}+`
  return null
}

export default async function PropertiesPage({ searchParams }: PropertiesPageProps) {
  const params = await searchParams
  const activeView = params.view === "list" ? "list" : "grid"

  const query: PropertyQueryParams = {
    search: params.search,
    purpose: params.purpose as PropertyQueryParams["purpose"],
    type: params.type as PropertyQueryParams["type"],
    division: params.division,
    district: params.district,
    area: params.area,
    minPrice: params.minPrice ? Number(params.minPrice) : undefined,
    maxPrice: params.maxPrice ? Number(params.maxPrice) : undefined,
    bedrooms: params.bedrooms ? Number(params.bedrooms) : undefined,
    verified: params.verified === "true" || undefined,
    sortBy: params.sortBy as PropertyQueryParams["sortBy"],
    sort: params.sortBy ? SORT_PARAM[params.sortBy] : undefined,
    page: params.page ? Number(params.page) : 1,
    limit: 12,
  }

  const res = await getProperties(query)
  const { data: properties, meta } = res
  const total = meta?.total ?? 0

  // One entry per applied filter: the label, and the params that removing it clears.
  const activeFilters = [
    params.search && { label: `Search: ${params.search}`, clears: ["search"] },
    params.purpose && { label: `Purpose: ${params.purpose}`, clears: ["purpose"] },
    params.type && { label: `Type: ${params.type}`, clears: ["type"] },
    params.division && { label: `Division: ${params.division}`, clears: ["division", "district"] },
    params.district && { label: `District: ${params.district}`, clears: ["district"] },
    params.area && { label: `Area: ${params.area}`, clears: ["area"] },
    params.bedrooms && { label: `${params.bedrooms}+ beds`, clears: ["bedrooms"] },
    params.verified === "true" && { label: "Verified only", clears: ["verified"] },
    (() => {
      const label = priceTag(params.minPrice, params.maxPrice)
      return label ? { label, clears: ["minPrice", "maxPrice"] } : null
    })(),
  ].filter(Boolean) as { label: string; clears: string[] }[]

  const recentSearchValue = [
    params.search,
    params.purpose,
    params.type,
    params.area,
    params.district,
    params.division,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <>
      {recentSearchValue && <RecentSearchRecorder value={recentSearchValue} />}
      <div className="section-y pt-2 sm:pt-10">
        <div className="container-page">
          {/* Phones: title and count on one row, then the quick filters. */}
          <div className="enter-cascade mb-3 sm:hidden">
            <div className="flex items-baseline justify-between gap-3">
              <h1 className="font-heading text-xl font-bold leading-tight tracking-tight text-brand-950">
                Properties
              </h1>
              <p className="shrink-0 text-sm text-ink-600">
                <span className="font-bold tabular-nums text-ink-900">
                  {total.toLocaleString("en-BD")}
                </span>{" "}
                {total === 1 ? "listing" : "listings"}
              </p>
            </div>

            <nav
              aria-label="Browse by purpose and type"
              className="-mx-4 mt-2.5 flex items-center gap-1.5 overflow-x-auto px-4 scrollbar-none"
            >
              {PURPOSE_CHIPS.map((chip) => (
                <Link
                  key={chip.label}
                  href={hrefWith(params, { purpose: chip.value })}
                  aria-current={(params.purpose || undefined) === chip.value ? "page" : undefined}
                  className="glass-chip"
                >
                  {chip.label}
                </Link>
              ))}
              <span aria-hidden="true" className="mx-0.5 h-5 w-px shrink-0 bg-ink-200" />
              {PROPERTY_TYPE_OPTIONS.map((opt) => {
                const active = params.type === opt.value
                return (
                  <Link
                    key={opt.value}
                    href={hrefWith(params, { type: active ? undefined : opt.value })}
                    aria-current={active ? "page" : undefined}
                    className="glass-chip"
                  >
                    {opt.label}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Tablet and up: the original directory header. */}
          <div className="enter-cascade mb-8 hidden gap-5 sm:grid lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <p className="eyebrow-pill">Property Directory</p>
              <h1 className="mt-4 text-h1 text-balance max-w-4xl">Scan Dhaka-area listings faster, without losing trust cues.</h1>
              <p className="mt-4 max-w-2xl text-lead">
                Browse verified homes, plots and commercial spaces across Bangladesh, with live filters and clear pricing.
              </p>
            </div>
            <div className="surface-card bg-brand-aurora p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Current view</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {activeFilters.length > 0 ? activeFilters.map((tag) => (
                  <span key={tag.label} className="rounded-full border border-brand-100 bg-white/85 px-3 py-1.5 text-xs font-medium text-ink-700">
                    {tag.label}
                  </span>
                )) : (
                  <span className="rounded-full border border-brand-100 bg-white/85 px-3 py-1.5 text-xs font-medium text-ink-700">
                    All listings
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:gap-8">
            <div className="hidden w-full shrink-0 lg:block lg:w-80">
              <Suspense fallback={null}>
                <FilterSidebar />
              </Suspense>
            </div>

            <div className="min-w-0 flex-1">
              <Suspense fallback={<div aria-hidden="true" className="h-10 sm:h-[3.25rem]" />}>
                <PropertiesToolbar total={total} />
              </Suspense>

              {/* Phones: each applied filter is a pill you can tap away, in one scrolling row. */}
              {activeFilters.length > 0 && (
                <ul className="-mx-4 mt-2.5 flex gap-1.5 overflow-x-auto px-4 pb-0.5 scrollbar-none sm:hidden">
                  {activeFilters.map((f) => (
                    <li key={f.label} className="shrink-0">
                      <Link
                        href={hrefWith(params, Object.fromEntries(f.clears.map((k) => [k, undefined])))}
                        aria-label={`Remove filter ${f.label}`}
                        className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 pl-3 pr-2 text-xs font-semibold text-brand-800 transition-colors active:bg-brand-100"
                      >
                        <span className="capitalize">{f.label}</span>
                        <X aria-hidden="true" className="size-3.5" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              {properties.length === 0 ? (
                <div className="mt-5">
                  <EmptyState
                    icon={Home}
                    title="No properties found"
                    description="Try adjusting your filters or search to find more results."
                  />
                </div>
              ) : (
                <>
                  <h2 className="sr-only">Property listings</h2>
                  {/* Items are a client wrapper so a view toggle or a filter change glides cards to their new spot. */}
                  <div
                    className={`mt-3 sm:mt-5 ${activeView === "list" ? "grid grid-cols-1 gap-2.5 sm:gap-5" : "grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3"}`}
                  >
                    {properties.map((p, i) => (
                      <PropertyResultsItem key={p.id}>
                        {/* .reveal sets its own transform, so it sits inside the layout item. */}
                        <div className="reveal">
                          <PropertyCard property={p} layout={activeView} eager={i < 3} />
                        </div>
                      </PropertyResultsItem>
                    ))}
                  </div>
                </>
              )}

              {meta && meta.totalPages > 1 && (
                <Suspense fallback={null}>
                  <PropertyPagination page={meta.page} totalPages={meta.totalPages} />
                </Suspense>
              )}
            </div>
          </div>
        </div>
      </div>
      <CompareFloatBar />
    </>
  )
}

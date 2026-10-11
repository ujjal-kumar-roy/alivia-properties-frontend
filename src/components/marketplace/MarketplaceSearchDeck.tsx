"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowUpRight, FileText, Search, Sparkles } from "lucide-react"

import { ROUTES } from "@/config/routes.config"

export type MarketplaceSearchItem = {
  slug: string
  name: string
  description?: string | null
  level?: "DEPARTMENT" | "CATEGORY" | "SUBCATEGORY"
  parentName?: string | null
}

const levelLabel = {
  DEPARTMENT: "Department",
  CATEGORY: "Category",
  SUBCATEGORY: "Quote-ready",
} as const

const preferredSuggestionSlugs = [
  "cement",
  "steel",
  "tile",
  "paint",
  "doors",
  "sanitary",
  "lift",
  "electrician",
  "plumber",
  "painter",
]

function cleanMeta(item: MarketplaceSearchItem) {
  const parent = item.parentName?.trim()

  if (parent && parent.toLowerCase() !== item.name.toLowerCase()) {
    return parent
  }

  return levelLabel[item.level ?? "CATEGORY"]
}

function getPreferredSuggestions(items: MarketplaceSearchItem[]) {
  const curated = preferredSuggestionSlugs
    .map((slug) => items.find((item) => item.slug === slug))
    .filter((item): item is MarketplaceSearchItem => Boolean(item))

  if (curated.length >= 6) return curated

  const seen = new Set(curated.map((item) => item.slug))
  const fallback = items.filter(
    (item) => item.level === "CATEGORY" && !seen.has(item.slug),
  )

  return [...curated, ...fallback]
}

export function MarketplaceSearchDeck({
  items,
  initialQuery = "",
}: {
  items: MarketplaceSearchItem[]
  initialQuery?: string
}) {
  const [query, setQuery] = useState(initialQuery)

  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase()
    const pool = q
      ? items.filter((item) =>
          [item.name, item.description, item.parentName, item.level]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q),
        )
      : getPreferredSuggestions(items)

    return pool.slice(0, 6)
  }, [items, query])

  const quickLinks = getPreferredSuggestions(items).slice(0, 5)

  return (
    <div className="mt-4 max-w-2xl rounded-2xl border border-black/5 bg-white/95 p-2.5 shadow-(--shadow-elevated) sm:mt-7 sm:rounded-[1.75rem] sm:p-3">
      <div className="mb-2 hidden flex-wrap items-start justify-between gap-3 sm:mb-3 sm:flex">
        <div className="min-w-0">
          <label
            htmlFor="marketplace-category-search"
            className="block text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-brand-700"
          >
            Quick shop marketplace
          </label>
          <p className="mt-1 text-sm text-ink-600">
            Search a category or jump into high-demand supply aisles.
          </p>
        </div>
        <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-gold-200 bg-gold-50 px-3 text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-gold-700">
          <Sparkles aria-hidden="true" className="size-3.5" />
          Ready to source
        </span>
      </div>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <label htmlFor="marketplace-category-search" className="sr-only sm:hidden">
            Search the marketplace
          </label>
          <Search
            aria-hidden="true"
            className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-brand-600"
          />
          <input
            id="marketplace-category-search"
            name="marketplace-search"
            type="search"
            autoComplete="off"
            placeholder="Search tiles, steel, paint, sanitary..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-11 w-full rounded-2xl border border-ink-200 bg-white pl-10 pr-4 text-base font-medium text-ink-900 outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-ink-400 focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-200 sm:h-12 sm:text-sm"
          />
        </div>
        <Link
          href={ROUTES.MARKETPLACE_REQUEST}
          aria-label="Request quotes"
          className="btn-tactile btn-tactile--sm shrink-0 !px-3.5 sm:!px-5"
        >
          <FileText aria-hidden="true" className="size-4" />
          <span className="hidden sm:inline">Request quotes</span>
        </Link>
      </div>

      <ul className="mt-2.5 grid grid-cols-2 gap-2 sm:mt-3">
        {visibleItems.length > 0 ? (
          visibleItems.map((item) => (
            <li key={item.slug} className="min-w-0">
              <Link
                href={ROUTES.MARKETPLACE_CATEGORY(item.slug)}
                className="group block min-w-0 rounded-xl border border-brand-100 bg-brand-50/70 px-2.5 py-2 text-left transition-[background-color,border-color,scale] duration-200 active:scale-[0.98] hover:border-brand-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 motion-reduce:transition-none motion-reduce:active:scale-100 sm:rounded-2xl sm:px-3 sm:py-3"
              >
                <span className="mb-2 hidden rounded-full border border-white/80 bg-white px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-brand-700 sm:inline-flex">
                  Shop category
                </span>
                <span className="flex min-w-0 items-start justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink-900">
                      {item.name}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-ink-500">
                      {cleanMeta(item)}
                    </span>
                  </span>
                  <ArrowUpRight
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-brand-600"
                  />
                </span>
              </Link>
            </li>
          ))
        ) : (
          <li className="col-span-2 rounded-xl border border-brand-100 bg-brand-50 px-3 py-3 text-sm text-ink-600">
            No aisle match yet. Try cement, tiles, paint, lift, or send one RFQ
            and Alivia will route it to the right supply desk.
          </li>
        )}
      </ul>

      {quickLinks.length > 0 && (
        <div className="mt-3 sm:mt-4">
          <div className="mb-2 hidden items-center justify-between gap-3 sm:flex">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
              Quick shop
            </p>
            <p className="text-xs text-ink-500">Popular starting points</p>
          </div>
          <div className="-mx-2.5 flex gap-1.5 overflow-x-auto px-2.5 pb-0.5 scrollbar-none sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            {quickLinks.map((item) => (
              <Link
                key={item.slug}
                href={ROUTES.MARKETPLACE_CATEGORY(item.slug)}
                className="glass-chip gap-1.5"
              >
                <span>Shop {item.name}</span>
                <ArrowUpRight aria-hidden="true" className="size-3.5" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

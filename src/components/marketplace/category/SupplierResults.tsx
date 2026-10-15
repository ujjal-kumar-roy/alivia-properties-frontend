"use client"

import { useCallback, useRef } from "react"

import { loadCategorySuppliers } from "@/app/marketplace/category/[slug]/actions"
import {
  feedKey,
  RESULTS_WRAPPER_CLASS,
  ResultsFooter,
  useResultsFeed,
  type ResultsNoun,
  type ResultsQuery,
} from "@/components/marketplace/category/ProductResults"
import {
  SUPPLIER_LIST_CLASS,
  SupplierCardSkeleton,
} from "@/components/marketplace/category/ResultSkeletons"
import { MarketplaceSupplierSummaryCard } from "@/components/marketplace/MarketplaceSupplierSummaryCard"
import type { Paginated } from "@/services/http-client"
import type { Supplier } from "@/types/marketplace.types"

type SupplierResultsProps = {
  initial: Paginated<Supplier>
  query: ResultsQuery
  nextHref: string | null
  /** Category the seller cards link their quote request to. Defaults to `query.category`. */
  categorySlug?: string
}

const SELLER_NOUN: ResultsNoun = { one: "seller", many: "sellers" }

/**
 * Category seller results: one seller card per row, with the same infinite
 * loading, "Show more" fallback, error retry and end note as ProductResults.
 * There is no grid/list choice here; the seller card is already a row.
 */
export function SupplierResults(props: SupplierResultsProps) {
  const key = feedKey("suppliers", props.query, props.initial.meta.page)
  return <SupplierFeed key={key} cacheKey={key} {...props} />
}

function SupplierFeed({
  initial,
  query,
  nextHref,
  categorySlug,
  cacheKey,
}: SupplierResultsProps & { cacheKey: string }) {
  const listRef = useRef<HTMLUListElement | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const limit = initial.meta.limit || undefined
  const load = useCallback(
    (page: number) => loadCategorySuppliers({ ...query, page, limit }),
    [query, limit],
  )
  const feed = useResultsFeed({
    initial,
    load,
    cacheKey,
    nextHref,
    listRef,
    sentinelRef,
    noun: SELLER_NOUN,
  })

  const remaining = Math.max(0, feed.total - feed.items.length)
  const skeletonCount = feed.status === "loading" ? Math.min(remaining || 1, 3) : 0

  return (
    <div id="category-results" className={RESULTS_WRAPPER_CLASS}>
      <ul ref={listRef} className={SUPPLIER_LIST_CLASS}>
        {feed.items.map((supplier) => (
          <li key={supplier.id} data-id={supplier.id} className="min-w-0">
            <MarketplaceSupplierSummaryCard
              supplier={supplier}
              categorySlug={categorySlug ?? query.category}
            />
          </li>
        ))}
        {Array.from({ length: skeletonCount }, (_, index) => (
          <li key={`skeleton-${index}`} aria-hidden="true" className="min-w-0">
            <SupplierCardSkeleton />
          </li>
        ))}
      </ul>

      <ResultsFooter feed={feed} sentinelRef={sentinelRef} />
    </div>
  )
}

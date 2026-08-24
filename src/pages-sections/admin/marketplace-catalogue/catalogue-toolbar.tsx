"use client"

import { RefreshCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SearchableSelect } from "@/components/common/searchable-select"
import { Input } from "@/components/ui/input"
import type { MarketplaceCategory } from "@/services/marketplace.service"

export function CatalogueToolbar({
  categories,
  categorySlug,
  onCategoryChange,
  search,
  onSearchChange,
  onRefresh,
  countFor,
}: {
  categories: MarketplaceCategory[]
  categorySlug: string
  onCategoryChange: (slug: string) => void
  search: string
  onSearchChange: (value: string) => void
  onRefresh: () => void
  countFor: (slug: string) => number
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-border/70 bg-white p-3">
      <div className="flex flex-1 flex-wrap gap-3">
        <label className="flex min-w-55 flex-1 flex-col gap-1 text-xs font-semibold text-ink-700">
          Category
          <SearchableSelect
            ariaLabel="Filter by category"
            value={categorySlug}
            onChange={onCategoryChange}
            options={categories.map((c) => ({ value: c.slug, label: `${c.name} (${countFor(c.slug)})` }))}
          />
        </label>
        <label className="flex min-w-55 flex-1 flex-col gap-1 text-xs font-semibold text-ink-700">
          Search
          <Input
            placeholder="Search suppliers or products…"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>
      </div>
      <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={onRefresh}>
        <RefreshCcw className="size-3.5" /> Refresh
      </Button>
    </div>
  )
}

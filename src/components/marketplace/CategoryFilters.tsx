"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2, SlidersHorizontal } from "lucide-react"

import { GlassSheet } from "@/components/common/glass-sheet"
import {
  KIND_OPTIONS,
  listingHref,
  sortOptionsFor,
  type KindKey,
  type ListingView,
  type SortKey,
} from "@/components/marketplace/category-filters"
import { haptic } from "@/lib/celebrate"
import { cn } from "@/lib/utils"

type CategoryFiltersProps = {
  /** The category page path the new filters are applied to. */
  basePath: string
  view: ListingView
  sort: SortKey
  kind: KindKey
}

/**
 * The [Filters] button and its bottom sheet: sort order and seller type.
 * Choices are held in the sheet until "Show results", which navigates (the
 * listing is server rendered, so the URL is the single source of truth and a
 * filtered view can be shared or reloaded).
 */
export function CategoryFilters({ basePath, view, sort, kind }: CategoryFiltersProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [draftSort, setDraftSort] = useState<SortKey>(sort)
  const [draftKind, setDraftKind] = useState<KindKey>(kind)

  const activeCount = (sort !== "newest" ? 1 : 0) + (kind !== "all" ? 1 : 0)
  const sortOptions = sortOptionsFor(view)

  function onOpenChange(next: boolean) {
    // Reopen on what is actually applied, not on an abandoned draft.
    if (next) {
      setDraftSort(sort)
      setDraftKind(kind)
    }
    setOpen(next)
  }

  function apply(nextSort: SortKey, nextKind: KindKey) {
    setOpen(false)
    startTransition(() => {
      router.push(listingHref(basePath, { view, sort: nextSort, kind: nextKind }))
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        aria-haspopup="dialog"
        className="btn-glass relative min-h-10 shrink-0 gap-1.5 px-3.5"
      >
        {pending ? (
          <Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
        ) : (
          <SlidersHorizontal aria-hidden="true" className="size-4" />
        )}
        Filters
        {activeCount > 0 ? (
          <span className="flex size-5 items-center justify-center rounded-full bg-brand-700 text-[0.6875rem] font-bold tabular-nums text-white">
            {activeCount}
          </span>
        ) : null}
        {pending ? <span className="sr-only">Updating results</span> : null}
      </button>

      <GlassSheet
        open={open}
        onOpenChange={onOpenChange}
        title="Sort and filter"
        description={view === "products" ? "Products in this category" : "Suppliers in this category"}
        footer={
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-glass shrink-0"
              onClick={() => {
                setDraftSort("newest")
                setDraftKind("all")
                haptic("tap")
              }}
            >
              Reset
            </button>
            <button
              type="button"
              className="btn-tactile flex-1"
              onClick={() => apply(draftSort, draftKind)}
            >
              Show results
            </button>
          </div>
        }
      >
        <fieldset className="mt-1">
          <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-500">
            Sort by
          </legend>
          <div role="radiogroup" aria-label="Sort by" className="grid gap-2">
            {sortOptions.map((option) => (
              <OptionRow
                key={option.value}
                label={option.label}
                selected={draftSort === option.value}
                onSelect={() => setDraftSort(option.value)}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-5">
          <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-500">
            Seller type
          </legend>
          <div role="radiogroup" aria-label="Seller type" className="grid gap-2">
            {KIND_OPTIONS.map((option) => (
              <OptionRow
                key={option.value}
                label={option.label}
                selected={draftKind === option.value}
                onSelect={() => setDraftKind(option.value)}
              />
            ))}
          </div>
        </fieldset>
      </GlassSheet>
    </>
  )
}

function OptionRow({
  label,
  selected,
  onSelect,
}: {
  label: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => {
        haptic("tap")
        onSelect()
      }}
      className="choice-card !min-h-12 !py-2 text-[0.9375rem]"
    >
      <span className="min-w-0 flex-1">{label}</span>
      <span
        aria-hidden="true"
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          selected ? "border-brand-600 bg-brand-600 text-white" : "border-ink-300 text-transparent",
        )}
      >
        <Check className="size-3.5" strokeWidth={3} />
      </span>
    </button>
  )
}

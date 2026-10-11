import Image from "next/image"
import { ChevronDown, Edit2, EyeOff, ImagePlus, MoreHorizontal, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { MarketplaceCategory } from "@/services/marketplace.service"
import { detectMode, MODE_LABEL } from "./types"

type Props = {
  cat: MarketplaceCategory
  depth: 0 | 1 | 2
  onEdit: (cat: MarketplaceCategory) => void
  onDelete: (cat: MarketplaceCategory) => void
  /** Present on department/category rows — adds a child node under this one. */
  onAddChild?: (cat: MarketplaceCategory) => void
  /** Departments, phones only: how many categories sit under it, whether they are shown, and the toggle. */
  childCount?: number
  expanded?: boolean
  onToggle?: () => void
}

const LEVEL_BADGE: Record<string, string> = {
  department: "bg-brand-100 text-brand-700",
  category: "bg-ink-100 text-ink-700",
  subcategory: "border border-gold-200 bg-gold-50 text-gold-700",
}

export function CategoryRow({
  cat,
  depth,
  onEdit,
  onDelete,
  onAddChild,
  childCount,
  expanded,
  onToggle,
}: Props) {
  const mode = detectMode(cat)
  const isLeaf = mode === "category"
  const thumb = cat.image?.url ?? cat.iconUrl ?? null
  const variantCount = cat.variants?.length ?? 0
  const fieldCount = cat.attributes?.length ?? 0
  const inactive = cat.isActive === false

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-xl border bg-white px-3 py-2.5 transition-shadow hover:shadow-sm sm:gap-3 sm:px-4 sm:py-3",
        depth === 0 && "border-brand-200 bg-brand-50/40",
        depth === 1 && "ml-3 border-border/70 sm:ml-6",
        depth === 2 && "ml-6 border-border/60 sm:ml-12",
        inactive && "opacity-60",
      )}
    >
      {/* Thumbnail */}
      <div className="relative size-10 shrink-0 overflow-hidden rounded-lg border border-border bg-ink-50">
        {thumb ? (
          <Image src={thumb} alt={cat.name} fill sizes="40px" className="object-cover" unoptimized />
        ) : (
          <div className="flex size-full items-center justify-center text-ink-300">
            <ImagePlus className="size-4" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="min-w-0 max-w-full truncate text-sm font-semibold text-ink-900">{cat.name}</p>
          <span className="hidden rounded-full bg-ink-100 px-2 py-0.5 font-mono text-[0.6875rem] text-ink-600 sm:inline-block">
            {cat.slug}
          </span>
          <span className={cn("rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold", LEVEL_BADGE[mode])}>
            {MODE_LABEL[mode]}
          </span>
          {inactive && (
            <span className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-[0.6875rem] font-medium text-ink-600">
              <EyeOff className="size-2.5" /> Hidden
            </span>
          )}
        </div>
        {cat.description && (
          <p className="mt-0.5 hidden truncate text-xs text-ink-500 sm:block">{cat.description}</p>
        )}

        {/* Quote configuration summary (categories — the quote leaf) */}
        {isLeaf && (
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {variantCount > 0 ? (
              <>
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[0.6875rem] font-medium text-brand-700">
                  {variantCount} variant{variantCount === 1 ? "" : "s"}
                </span>
                {fieldCount > 0 && (
                  <span className="rounded-full border border-gold-200 bg-gold-50 px-2 py-0.5 text-[0.6875rem] font-medium text-gold-700">
                    {fieldCount} spec field{fieldCount === 1 ? "" : "s"}
                  </span>
                )}
              </>
            ) : (
              <span className="text-[0.6875rem] italic text-ink-500">
                No quote variants yet. Tap edit to configure.
              </span>
            )}
            {!cat.image?.url && (
              <span className="text-[0.6875rem] italic text-amber-700">No image yet</span>
            )}
          </div>
        )}

        {/* Phones: a department folds its categories away so the page is not a 60-row scroll */}
        {onToggle && childCount !== undefined && childCount > 0 ? (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            className="-ml-1 mt-1 inline-flex min-h-9 items-center gap-1 rounded-full px-1 text-xs font-semibold text-brand-700 md:hidden"
          >
            {expanded ? "Hide" : "Show"} {childCount} categor{childCount === 1 ? "y" : "ies"}
            <ChevronDown
              aria-hidden
              className={cn("size-4 transition-transform duration-200", expanded && "rotate-180")}
            />
          </button>
        ) : null}
      </div>

      {/* Order badge */}
      <span className="hidden shrink-0 rounded-full border border-border/60 px-2 py-0.5 text-xs text-ink-500 sm:inline-block">
        #{cat.order}
      </span>

      {/* sm and up: the icon buttons */}
      <div className="ml-auto hidden shrink-0 items-center gap-1 sm:flex">
        {onAddChild && (
          <Button
            type="button" size="icon" variant="ghost"
            className="size-8 rounded-full text-ink-600 hover:bg-brand-50 hover:text-brand-700"
            onClick={() => onAddChild(cat)}
            aria-label="Add category"
            title="Add category"
          >
            <Plus className="size-3.5" />
          </Button>
        )}
        <Button
          type="button" size="icon" variant="ghost"
          className="size-8 rounded-full text-ink-600 hover:bg-brand-50 hover:text-brand-700"
          onClick={() => onEdit(cat)} aria-label="Edit"
        >
          <Edit2 className="size-3.5" />
        </Button>
        <Button
          type="button" size="icon" variant="ghost"
          className="size-8 rounded-full text-ink-600 hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onDelete(cat)} aria-label="Delete"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      {/* Phones: one overflow menu */}
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Actions for ${cat.name}`}
          className="ml-auto inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border/70 bg-white text-ink-700 outline-none transition-[background-color,scale] active:scale-95 data-popup-open:bg-brand-50 sm:hidden"
        >
          <MoreHorizontal aria-hidden className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={6} className="min-w-48 rounded-2xl p-1.5">
          {onAddChild ? (
            <DropdownMenuItem
              className="min-h-11 gap-2.5 rounded-xl px-3 text-sm font-medium"
              onClick={() => onAddChild(cat)}
            >
              <Plus aria-hidden className="size-4" />
              Add category
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            className="min-h-11 gap-2.5 rounded-xl px-3 text-sm font-medium"
            onClick={() => onEdit(cat)}
          >
            <Edit2 aria-hidden className="size-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            className="min-h-11 gap-2.5 rounded-xl px-3 text-sm font-medium"
            onClick={() => onDelete(cat)}
          >
            <Trash2 aria-hidden className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

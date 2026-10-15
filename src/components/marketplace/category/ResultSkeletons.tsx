import { cn } from "@/lib/utils"

/*
 * Placeholders for category results, shaped like the real grid card, list row
 * and seller card so nothing jumps when the content lands. Plain markup (no
 * client code), so a loading.tsx can use them too.
 */

/** Product grid: 2 columns on phones up to 5 on wide screens. */
export const PRODUCT_GRID_CLASS =
  "grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-6 lg:grid-cols-4 xl:grid-cols-5"
/** Product list: dense rows split by hairlines. */
export const PRODUCT_LIST_CLASS = "divide-y divide-ink-100"
/** Sellers: one card per row (compact row on phones, wide card from md). */
export const SUPPLIER_LIST_CLASS = "grid gap-2.5 sm:gap-4"

/**
 * A slow, low-contrast light band instead of `animate-pulse`. It reuses the
 * global `shimmer` keyframes and only runs for visitors who allow motion;
 * with reduced motion the blocks are plain flat grey.
 */
const SHIMMER =
  "bg-ink-100 motion-safe:animate-[shimmer_2.4s_linear_infinite] motion-safe:bg-[linear-gradient(90deg,var(--color-ink-100)_30%,var(--color-ink-50)_50%,var(--color-ink-100)_70%)] motion-safe:bg-size-[200%_100%]"

function Bone({ className }: { className?: string }) {
  return <div className={cn(SHIMMER, "rounded-md", className)} />
}

/** Same footprint as MarketplaceProductCard: square photo, name, seller line, price, facts. */
export function ProductCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("min-w-0 overflow-hidden rounded-2xl border border-black/5 bg-white", className)}
    >
      <Bone className="aspect-square w-full rounded-none" />
      <div className="space-y-2 p-2.5 sm:p-3">
        <Bone className="h-3.5 w-11/12" />
        <Bone className="h-3.5 w-3/5" />
        <Bone className="h-3 w-1/2" />
        <Bone className="mt-3 h-5 w-2/5" />
        <Bone className="h-3 w-3/5" />
      </div>
    </div>
  )
}

/** Same footprint as ProductRow: 88px thumbnail, two name lines, price, facts, round add button. */
export function ProductRowSkeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("relative py-1", className)}>
      <div className="flex gap-3 p-2 md:items-center md:pr-16">
        <Bone className="size-22 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1 space-y-2 py-0.5">
          <Bone className="h-3.5 w-11/12 md:w-1/2" />
          <Bone className="h-3.5 w-1/2 md:w-1/3" />
          <Bone className="mt-3 h-4.5 w-1/3 md:w-1/5" />
          <Bone className="h-3 w-3/5 md:w-2/5" />
        </div>
      </div>
      <Bone className="absolute bottom-3 right-2 size-11 rounded-full md:bottom-auto md:top-1/2 md:-translate-y-1/2" />
    </div>
  )
}

/** Same footprint as MarketplaceSupplierSummaryCard (compact row on phones, wide card from md). */
export function SupplierCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex gap-2.5 overflow-hidden rounded-2xl border border-black/5 bg-white p-2 md:grid md:grid-cols-[170px_minmax(0,1fr)_auto] md:items-center md:gap-6 md:rounded-3xl md:p-5",
        className,
      )}
    >
      <Bone className="aspect-square w-25 shrink-0 self-start rounded-xl md:w-full md:rounded-2xl" />
      <div className="min-w-0 flex-1 space-y-2 py-0.5">
        <Bone className="h-4 w-3/5 md:h-6" />
        <Bone className="h-3 w-2/5" />
        <Bone className="mt-3 h-3 w-4/5" />
        <Bone className="mt-3 h-4 w-1/3" />
      </div>
      <div className="hidden w-36 flex-col gap-2 md:flex">
        <Bone className="h-10 rounded-xl" />
        <Bone className="h-10 rounded-xl" />
      </div>
    </div>
  )
}

/**
 * A whole first-load placeholder for a results list (for a loading.tsx). The
 * infinite list renders its own tiles inline while it fetches the next page.
 */
export function ResultsSkeleton({
  kind = "grid",
  count,
}: {
  kind?: "grid" | "list" | "suppliers"
  count?: number
}) {
  if (kind === "suppliers") {
    return (
      <ul aria-hidden="true" className={SUPPLIER_LIST_CLASS}>
        {Array.from({ length: count ?? 3 }, (_, index) => (
          <li key={index}>
            <SupplierCardSkeleton />
          </li>
        ))}
      </ul>
    )
  }
  if (kind === "list") {
    return (
      <ul aria-hidden="true" className={PRODUCT_LIST_CLASS}>
        {Array.from({ length: count ?? 6 }, (_, index) => (
          <li key={index}>
            <ProductRowSkeleton />
          </li>
        ))}
      </ul>
    )
  }
  return (
    <ul aria-hidden="true" className={PRODUCT_GRID_CLASS}>
      {Array.from({ length: count ?? 10 }, (_, index) => (
        <li key={index} className="min-w-0">
          <ProductCardSkeleton />
        </li>
      ))}
    </ul>
  )
}

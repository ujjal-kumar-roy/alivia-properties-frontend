import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { ROUTES } from "@/config/routes.config"
import type { MarketplaceCategory } from "@/services/marketplace.service"
import { CategoryImageCard } from "./CategoryImageCard"

// Fixed accent colors per group index (cycles if > 5 groups)
const GROUP_ACCENTS = [
  { bar: "bg-gold-400", badge: "bg-gold-50 text-gold-700 border-gold-200" },
  { bar: "bg-brand-500", badge: "bg-brand-50 text-brand-700 border-brand-200" },
  { bar: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { bar: "bg-red-400", badge: "bg-red-50 text-red-700 border-red-200" },
  { bar: "bg-violet-500", badge: "bg-violet-50 text-violet-700 border-violet-200" },
]

type Props = {
  group: MarketplaceCategory
  items: MarketplaceCategory[]
  index: number
}

/**
 * One department block: heading, count, and its categories as tiles. Phones get
 * a tight header (the badge and tagline step aside) and a 2 column grid.
 */
export function CategoryGroupSection({ group, items: children, index }: Props) {
  const accent = GROUP_ACCENTS[index % GROUP_ACCENTS.length]!
  const childCountLabel =
    children.length === 1 ? "1 category to shop" : `${children.length} categories to shop`

  return (
    <section
      id={`group-${group.slug}`}
      className="scroll-mt-16"
    >
      <div className="rounded-2xl border border-border/70 bg-white/90 p-3 shadow-sm sm:rounded-[1.75rem] sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
          <div className="flex min-w-0 items-start gap-3">
            {/* Colored accent bar */}
            <div aria-hidden="true" className={`mt-1 h-8 w-1 shrink-0 rounded-full sm:h-10 ${accent.bar}`} />
            <div className="min-w-0">
              <span
                className={`mb-2 hidden rounded-full border px-2.5 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-widest sm:inline-block ${accent.badge}`}
              >
                {group.name}
              </span>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <h2 className="font-sans text-lg font-semibold text-ink-900 sm:text-xl">
                  Shop {group.name}
                </h2>
                <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-600 sm:px-2.5 sm:py-1">
                  {childCountLabel}
                </span>
              </div>
              {group.description && (
                <p className="mt-1 hidden max-w-2xl text-sm text-ink-500 sm:block">
                  {group.description}
                </p>
              )}
            </div>
          </div>
          {children.length > 0 && (
            <Link
              href={ROUTES.MARKETPLACE_CATEGORY(group.slug)}
              className="btn-glass shrink-0 !px-3 sm:min-h-11 sm:!px-4"
            >
              <span className="sm:hidden">View all</span>
              <span className="hidden sm:inline">View all in {group.name}</span>
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          )}
        </div>

        {children.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border py-6 text-center text-sm text-ink-500 sm:py-8">
            No items in this category yet.
          </p>
        ) : (
          <ul className="reveal-stagger grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {children.map((cat) => (
              <li key={cat.slug} className="min-w-0">
                <CategoryImageCard cat={cat} className="h-full" />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

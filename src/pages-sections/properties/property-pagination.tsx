"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCallback } from "react"

interface PropertyPaginationProps {
  page: number
  totalPages: number
}

export function PropertyPagination({ page, totalPages }: PropertyPaginationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const goTo = useCallback(
    (p: number) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set("page", String(p))
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams],
  )

  const pages = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
    if (totalPages <= 7) return i + 1
    if (page <= 4) return i + 1
    if (page >= totalPages - 3) return totalPages - 6 + i
    return page - 3 + i
  })

  return (
    <nav aria-label="Pagination" className="mt-5 sm:mt-8">
      {/* Phones: seven page buttons would not fit, so it is Previous, "2 of 4", Next. */}
      <div className="flex items-center justify-between gap-3 sm:hidden">
        <button
          type="button"
          onClick={() => goTo(page - 1)}
          disabled={page <= 1}
          className="btn-glass min-h-10 flex-1 disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          Previous
        </button>
        <p className="shrink-0 text-sm font-semibold tabular-nums text-ink-700">
          {page} of {totalPages}
        </p>
        <button
          type="button"
          onClick={() => goTo(page + 1)}
          disabled={page >= totalPages}
          className="btn-glass min-h-10 flex-1 disabled:pointer-events-none disabled:opacity-40"
        >
          Next
          <ChevronRight aria-hidden="true" className="size-4" />
        </button>
      </div>

      <div className="hidden items-center justify-center gap-1 sm:flex">
        <button
          type="button"
          onClick={() => goTo(page - 1)}
          disabled={page <= 1}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-ink-500 hover:bg-ink-50 disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => goTo(p)}
            aria-label={`Page ${p}`}
            aria-current={p === page ? "page" : undefined}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg border text-xs font-medium transition-colors",
              p === page
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-border text-ink-700 hover:bg-ink-50",
            )}
          >
            {p}
          </button>
        ))}

        <button
          type="button"
          onClick={() => goTo(page + 1)}
          disabled={page >= totalPages}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-ink-500 hover:bg-ink-50 disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  )
}

"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Pagination } from "@/components/common/pagination"
import { Button } from "@/components/ui/button"
import type { PaginationMeta } from "@/services/http-client"
import { cn } from "@/lib/utils"

/** URL-synced pager for dashboard tables. The `page` search param is the
 *  source of truth - clicking a page pushes a new URL and the server page
 *  refetches. Renders nothing for an empty list. Phones get a compact
 *  previous / "page x of y" / next row; sm and up keep numbered pages. */
export function TablePagination({ meta, className }: { meta?: PaginationMeta; className?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  if (!meta || meta.total === 0) return null

  const start = (meta.page - 1) * meta.limit + 1
  const end = Math.min(meta.page * meta.limit, meta.total)

  function goTo(p: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", String(p))
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className={cn("mt-3 sm:mt-4", className)}>
      {/* Phones */}
      <div className="flex items-center justify-between gap-3 sm:hidden">
        {meta.totalPages > 1 ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-10 rounded-full"
            onClick={() => goTo(meta.page - 1)}
            disabled={meta.page <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" />
          </Button>
        ) : null}
        <p className="flex-1 text-center text-xs leading-snug text-ink-600">
          {meta.totalPages > 1 ? (
            <span className="block font-semibold text-ink-800">
              Page {meta.page} of {meta.totalPages}
            </span>
          ) : null}
          Showing {start}-{end} of {meta.total}
        </p>
        {meta.totalPages > 1 ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-10 rounded-full"
            onClick={() => goTo(meta.page + 1)}
            disabled={meta.page >= meta.totalPages}
            aria-label="Next page"
          >
            <ChevronRight className="size-4" />
          </Button>
        ) : null}
      </div>

      {/* sm and up */}
      <div className="hidden flex-col items-center gap-3 sm:flex sm:flex-row sm:justify-between">
        <p className="text-xs text-ink-500">
          Showing {start}-{end} of {meta.total}
        </p>
        <Pagination page={meta.page} totalPages={meta.totalPages} onChange={goTo} />
      </div>
    </div>
  )
}

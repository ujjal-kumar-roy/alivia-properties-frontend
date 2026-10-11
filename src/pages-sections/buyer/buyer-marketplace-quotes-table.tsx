"use client"

import Link from "next/link"
import { Eye } from "lucide-react"

import { DataTable, type DataTableColumn } from "@/components/dashboard/data-table"
import { FilterBar } from "@/components/dashboard/filter-bar"
import { QuoteStatusBadge } from "@/components/dashboard/quote-status-badge"
import { Button } from "@/components/ui/button"
import { ROUTES } from "@/config/routes.config"
import { useUrlFilter } from "@/hooks/use-url-filter"
import type { QuoteRequest, QuoteStatus } from "@/types/quote.types"
import { formatDate } from "@/utils/format-date"

/** Low-priority table columns: shown from xl, where the sidebar layout has room for them. */
const FROM_XL = "hidden xl:table-cell"

const STATUS_FILTERS: { value: QuoteStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "NEW", label: "New" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "NEGOTIATING", label: "Negotiating" },
  { value: "QUOTE_SENT", label: "Quote sent" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
  { value: "CLOSED", label: "Closed" },
]

function formatMoney(value?: number | null) {
  if (value == null) return "-"
  return `BDT ${value.toLocaleString("en-BD")}`
}

export function BuyerMarketplaceQuotesTable({
  quotes,
  status = "all",
}: {
  quotes: QuoteRequest[]
  status?: QuoteStatus | "all"
}) {
  const setFilter = useUrlFilter()

  const columns: DataTableColumn<QuoteRequest>[] = [
    {
      key: "request",
      header: "Request",
      primaryOnMobile: true,
      render: (quote) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink-900">
            {quote.product?.name ?? quote.supplier?.name ?? quote.categorySlug ?? "General quote"}
          </p>
          <p className="mt-0.5 line-clamp-2 max-w-[26rem] text-xs text-ink-500 max-sm:max-w-none">
            {quote.message}
          </p>
        </div>
      ),
    },
    {
      key: "supplier",
      header: "Supplier",
      mobileLabel: false,
      render: (quote) =>
        quote.supplier ? (
          <Link
            href={ROUTES.MARKETPLACE_SUPPLIER(quote.supplier.slug)}
            className="text-xs font-medium text-brand-700 hover:text-brand-800"
          >
            {quote.supplier.name}
          </Link>
        ) : (
          <span className="text-xs text-ink-500">Marketplace team</span>
        ),
    },
    {
      key: "quantity",
      header: "Quantity",
      className: FROM_XL,
      hideOnMobile: true,
      render: (quote) => (
        <div className="text-xs text-ink-700">
          <p className="font-medium">{formatMoney(quote.finalQuotedPrice)}</p>
          {quote.quantity ? (
            <p className="mt-0.5 text-ink-500">
              {quote.quantity} {quote.unit ?? "units"}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      badgeOnMobile: true,
      render: (quote) => <QuoteStatusBadge status={quote.status} />,
    },
    {
      key: "reply",
      header: "Latest reply",
      mobileLabel: "Reply",
      wideOnMobile: true,
      render: (quote) => (
        <span className="line-clamp-2 max-w-[18rem] text-xs text-ink-600 max-sm:max-w-none">
          {quote.reply ?? "No reply yet"}
        </span>
      ),
    },
    {
      key: "created",
      header: "Submitted",
      className: FROM_XL,
      hideOnMobile: true,
      render: (quote) => (
        <span className="text-xs text-ink-500">{formatDate(quote.createdAt)}</span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (quote) => (
        <Button
          size="sm"
          variant="outline"
          className="rounded-full max-sm:h-9 max-sm:px-4"
          render={<Link href={ROUTES.BUYER_MARKETPLACE_QUOTE_DETAIL(quote.id)} />}
        >
          <Eye className="size-3.5" />
          View
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-3 sm:space-y-4">
      <FilterBar
        groups={[{ name: "status", label: "Status", value: status, options: STATUS_FILTERS }]}
        onChange={setFilter}
      />
      <DataTable
        columns={columns}
        data={quotes}
        rowKey={(quote) => quote.id}
        emptyMessage="No marketplace quote requests yet."
      />
    </div>
  )
}

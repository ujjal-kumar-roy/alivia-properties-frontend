export const dynamic = "force-dynamic"

import { getInquiries } from "@/services/inquiries.service"
import { DASHBOARD_PAGE_SIZE } from "@/lib/constants"
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header"
import { DataTable, type DataTableColumn } from "@/components/dashboard/data-table"
import { TablePagination } from "@/components/dashboard/table-pagination"
import { InquiryStatusBadge } from "@/components/dashboard/inquiry-status-badge"
import { Button } from "@/components/ui/button"
import { ROUTES } from "@/config/routes.config"
import { formatDateTime } from "@/utils/format-date"
import { getCurrentBuyer } from "@/utils/dashboard-session"
import Link from "next/link"
import { Eye } from "lucide-react"
import type { Inquiry } from "@/types/inquiry.types"

export default async function BuyerInquiriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  await getCurrentBuyer()
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)
  const inquiries = await getInquiries({ page, limit: DASHBOARD_PAGE_SIZE })

  const columns: DataTableColumn<Inquiry>[] = [
    {
      key: "subject",
      header: "Subject",
      primaryOnMobile: true,
      render: (row) => (
        <div className="min-w-0">
          <p className="font-semibold text-ink-900 max-sm:truncate">{row.propertyTitle ?? row.projectName ?? "General inquiry"}</p>
          <p className="text-xs text-ink-500 capitalize">{row.type}</p>
        </div>
      ),
    },
    {
      key: "message",
      header: "Message",
      mobileLabel: false,
      wideOnMobile: true,
      render: (row) => <p className="line-clamp-2 max-w-xl text-sm text-ink-600 max-sm:max-w-none max-sm:text-xs">{row.message}</p>,
    },
    {
      key: "status",
      header: "Status",
      badgeOnMobile: true,
      render: (row) => <InquiryStatusBadge status={row.status} />,
    },
    {
      key: "date",
      header: "Sent",
      mobileLabel: false,
      render: (row) => <span className="text-xs text-ink-500 sm:text-sm sm:text-inherit">{formatDateTime(row.createdAt)}</span>,
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <Button
          size="sm"
          variant="outline"
          className="rounded-full max-sm:h-9 max-sm:px-4"
          render={<Link href={ROUTES.BUYER_INQUIRY_DETAIL(row.id)} />}
        >
          <Eye className="size-3.5" />
          View
        </Button>
      ),
    },
  ]

  return (
    <div>
      <DashboardPageHeader
        title="My Inquiries"
        description="Track every property and apartment message you have sent."
      />
      <DataTable columns={columns} data={inquiries.data} />
      <TablePagination meta={inquiries.meta} />
    </div>
  )
}

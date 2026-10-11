export const dynamic = "force-dynamic"

import { getBookings } from "@/services/bookings.service"
import { DASHBOARD_PAGE_SIZE } from "@/lib/constants"
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header"
import { DataTable, type DataTableColumn } from "@/components/dashboard/data-table"
import { TablePagination } from "@/components/dashboard/table-pagination"
import { BookingStatusBadge } from "@/components/dashboard/booking-status-badge"
import { formatDate, formatDateTime } from "@/utils/format-date"
import { getCurrentBuyer } from "@/utils/dashboard-session"
import type { Booking } from "@/types/booking.types"

export default async function BuyerBookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  await getCurrentBuyer()
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)
  const bookings = await getBookings({ page, limit: DASHBOARD_PAGE_SIZE })

  const columns: DataTableColumn<Booking>[] = [
    {
      key: "type",
      header: "Consultation",
      primaryOnMobile: true,
      render: (row) => (
        <div className="min-w-0">
          <p className="font-semibold text-ink-900 capitalize max-sm:truncate">{row.consultationType}</p>
          <p className="text-xs text-ink-500 max-sm:truncate">{row.propertyTitle ?? row.projectName ?? "General request"}</p>
        </div>
      ),
    },
    {
      key: "schedule",
      header: "Schedule",
      mobileLabel: false,
      render: (row) => (
        <span className="text-xs font-medium text-ink-800 sm:text-sm sm:font-normal sm:text-inherit">
          {`${formatDate(row.preferredDate)} · ${row.preferredTime}`}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      badgeOnMobile: true,
      render: (row) => <BookingStatusBadge status={row.status} />,
    },
    {
      key: "created",
      header: "Requested",
      hideOnMobile: true,
      render: (row) => formatDateTime(row.createdAt),
    },
  ]

  return (
    <div>
      <DashboardPageHeader
        title="My Bookings"
        description="See consultation requests and current confirmation status."
      />
      <DataTable columns={columns} data={bookings.data} />
      <TablePagination meta={bookings.meta} />
    </div>
  )
}

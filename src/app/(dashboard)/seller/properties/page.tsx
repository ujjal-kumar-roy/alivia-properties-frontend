export const dynamic = "force-dynamic"

import Link from "next/link"
import { auth } from "@/auth"
import { getProperties } from "@/services/properties.service"
import { DASHBOARD_PAGE_SIZE } from "@/lib/constants"
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header"
import { TablePagination } from "@/components/dashboard/table-pagination"
import { ROUTES } from "@/config/routes.config"
import { SellerPropertiesTable } from "@/pages-sections/admin/admin-views"
import { getCurrentSeller } from "@/utils/dashboard-session"
import type { PropertyStatus } from "@/types/property.types"

export default async function SellerPropertiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)
  const seller = await getCurrentSeller()
  const session = await auth()
  const emptyPage = { data: [], meta: { page: 1, limit: DASHBOARD_PAGE_SIZE, total: 0, totalPages: 0 } }
  const res = await getProperties(
    { sellerId: seller.id, page, limit: DASHBOARD_PAGE_SIZE, status: sp.status },
    session?.accessToken,
  ).catch(() => emptyPage)

  return (
    <div>
      <DashboardPageHeader
        title="My Properties"
        description="Manage your active and pending property listings."
        actions={(
          <Link href={ROUTES.SELLER_PROPERTY_CREATE} className="btn-tactile btn-tactile--sm">
            Add Property
          </Link>
        )}
      />
      <SellerPropertiesTable
        key={`${page}-${sp.status ?? "all"}`}
        properties={res.data}
        status={(sp.status as PropertyStatus | "all") ?? "all"}
      />
      <TablePagination meta={res.meta} />
    </div>
  )
}

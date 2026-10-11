export const dynamic = "force-dynamic"

import Link from "next/link"
import { auth } from "@/auth"
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header"
import { TablePagination } from "@/components/dashboard/table-pagination"
import { Button } from "@/components/ui/button"
import { PropertyCard } from "@/components/properties/property-card"
import { ROUTES } from "@/config/routes.config"
import { DASHBOARD_PAGE_SIZE } from "@/lib/constants"
import { propertiesService } from "@/services/properties.service"

export default async function BuyerSavedPropertiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const session = await auth()
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)
  const saved = await propertiesService
    .saved({ page, limit: DASHBOARD_PAGE_SIZE }, session?.accessToken)
    .catch(() => ({
      data: [],
      meta: { page: 1, limit: DASHBOARD_PAGE_SIZE, total: 0, totalPages: 0 },
    }))

  return (
    <div>
      <DashboardPageHeader
        title="Saved Properties"
        description="Properties you've saved for easy access."
        actions={(
          <Button
            variant="outline"
            className="rounded-full max-sm:h-9"
            render={<Link href={ROUTES.PROPERTIES} />}
          >
            Browse Listings
          </Button>
        )}
      />

      {saved.data.length === 0 ? (
        <div className="mt-3 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-12 text-center sm:mt-6 sm:py-16">
          <p className="text-sm font-medium text-ink-700">No saved properties yet</p>
          <p className="mt-1 text-xs text-ink-500">Heart a listing to keep it in your shortlist.</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 rounded-full max-sm:h-9"
            render={<Link href={ROUTES.PROPERTIES} />}
          >
            Browse Listings
          </Button>
        </div>
      ) : (
        <div className="mt-3 grid gap-2.5 sm:mt-6 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
          {saved.data.map((property) => <PropertyCard key={property.id} property={property} />)}
        </div>
      )}
      <TablePagination meta={saved.meta} />
    </div>
  )
}

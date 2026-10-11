export const dynamic = "force-dynamic"

import Link from "next/link"
import { Building2, Plus } from "lucide-react"
import { getProjects } from "@/services/projects.service"
import { DASHBOARD_PAGE_SIZE } from "@/lib/constants"
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header"
import { TablePagination } from "@/components/dashboard/table-pagination"
import { AdminProjectsTable } from "@/pages-sections/admin/admin-views"
import { ROUTES } from "@/config/routes.config"
import type { ProjectStatus } from "@/types/project.types"

export default async function AdminProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)
  const res = await getProjects({ page, limit: DASHBOARD_PAGE_SIZE, status: sp.status })

  return (
    <div>
      <DashboardPageHeader
        icon={Building2}
        eyebrow="Inventory"
        title="Apartments"
        description="Manage Alivia’s own apartment showcase — create, edit, publish status, and feature."
        actions={(
          <Link href={ROUTES.ADMIN_PROJECT_CREATE} className="btn-tactile btn-tactile--sm">
            <Plus className="size-4" />
            Add Apartment
          </Link>
        )}
      />
      <AdminProjectsTable
        key={`${page}-${sp.status ?? "all"}`}
        projects={res.data}
        status={(sp.status as ProjectStatus | "all") ?? "all"}
      />
      <TablePagination meta={res.meta} />
    </div>
  )
}

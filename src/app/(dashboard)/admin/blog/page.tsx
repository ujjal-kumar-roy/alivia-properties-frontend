export const dynamic = "force-dynamic"

import { FileText } from "lucide-react"
import Link from "next/link"
import { auth } from "@/auth"
import { blogService } from "@/services/blog.service"
import { DASHBOARD_PAGE_SIZE } from "@/lib/constants"
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header"
import { TablePagination } from "@/components/dashboard/table-pagination"
import { AdminBlogTable } from "@/pages-sections/admin/admin-views"
import { ROUTES } from "@/config/routes.config"

export default async function AdminBlogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)
  const status = sp.status ?? "all"
  const session = await auth()
  const token = session?.accessToken
  const res = await blogService
    .adminList({ page, limit: DASHBOARD_PAGE_SIZE, status }, token)
    .catch(() => ({
      data: [],
      meta: { page: 1, limit: DASHBOARD_PAGE_SIZE, total: 0, totalPages: 0 },
    }))

  return (
    <div>
      <DashboardPageHeader
        icon={FileText}
        eyebrow="Content"
        title="Blog"
        description="Create drafts, publish articles, and manage the public market journal."
        actions={
          <Link href={ROUTES.ADMIN_BLOG_CREATE} className="btn-tactile btn-tactile--sm">
            New article
          </Link>
        }
      />
      <AdminBlogTable
        key={`${page}-${status}`}
        posts={res.data}
        token={token}
        status={status as "all" | "published" | "draft"}
      />
      <TablePagination meta={res.meta} />
    </div>
  )
}

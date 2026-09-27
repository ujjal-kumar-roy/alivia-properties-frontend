export const dynamic = "force-dynamic"

import { notFound } from "next/navigation"

import { auth } from "@/auth"
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header"
import { ROUTES } from "@/config/routes.config"
import { UserDetailPanel } from "@/pages-sections/users/user-detail-panel"
import { usersService } from "@/services/users.service"

type AdminUserDetailPageProps = {
  params: Promise<{ id: string }>
}

export default async function AdminUserDetailPage({ params }: AdminUserDetailPageProps) {
  const session = await auth()
  const { id } = await params
  const user = await usersService.byId(id, session?.accessToken).catch(() => null)

  if (!session?.user || !user) notFound()

  return (
    <div className="space-y-5">
      <DashboardPageHeader
        eyebrow="People"
        title="User detail"
        description="Review the account, then manage its role and verification status."
      />
      <UserDetailPanel
        user={user}
        token={session.accessToken}
        currentUserId={session.user.id}
        backHref={ROUTES.ADMIN_USERS}
      />
    </div>
  )
}

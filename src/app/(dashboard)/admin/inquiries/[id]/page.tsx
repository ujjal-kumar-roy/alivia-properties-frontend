export const dynamic = "force-dynamic"

import { notFound } from "next/navigation"

import { auth } from "@/auth"
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header"
import { ROUTES } from "@/config/routes.config"
import { InquiryDetailPanel } from "@/pages-sections/inquiries/inquiry-detail-panel"
import { getInquiry } from "@/services/inquiries.service"

type AdminInquiryDetailPageProps = {
  params: Promise<{ id: string }>
}

export default async function AdminInquiryDetailPage({
  params,
}: AdminInquiryDetailPageProps) {
  const session = await auth()
  const { id } = await params
  const inquiry = await getInquiry(id).catch(() => null)

  if (!session?.user || !inquiry) notFound()

  return (
    <div className="space-y-3 sm:space-y-5">
      <DashboardPageHeader
        className="max-sm:hidden"
        title="Inquiry detail"
        description="Review the conversation and update the lead status."
      />
      <InquiryDetailPanel
        inquiry={inquiry}
        token={session.accessToken}
        role="admin"
        backHref={ROUTES.ADMIN_INQUIRIES}
      />
    </div>
  )
}

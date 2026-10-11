export const dynamic = "force-dynamic"

import { notFound } from "next/navigation"

import { auth } from "@/auth"
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header"
import { ROUTES } from "@/config/routes.config"
import { InquiryDetailPanel } from "@/pages-sections/inquiries/inquiry-detail-panel"
import { getInquiry } from "@/services/inquiries.service"
import { getCurrentSeller } from "@/utils/dashboard-session"

type SellerInquiryDetailPageProps = {
  params: Promise<{ id: string }>
}

export default async function SellerInquiryDetailPage({
  params,
}: SellerInquiryDetailPageProps) {
  await getCurrentSeller()
  const session = await auth()
  const { id } = await params
  const inquiry = await getInquiry(id).catch(() => null)

  if (!inquiry) notFound()

  return (
    <div className="space-y-3 sm:space-y-5">
      <DashboardPageHeader
        className="max-sm:hidden"
        title="Inquiry detail"
        description="Review the lead, contact the buyer, and keep the response status updated."
      />
      <InquiryDetailPanel
        inquiry={inquiry}
        token={session?.accessToken}
        role="seller"
        backHref={ROUTES.SELLER_INQUIRIES}
      />
    </div>
  )
}

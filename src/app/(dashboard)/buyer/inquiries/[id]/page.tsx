export const dynamic = "force-dynamic"

import { notFound } from "next/navigation"

import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header"
import { ROUTES } from "@/config/routes.config"
import { InquiryDetailPanel } from "@/pages-sections/inquiries/inquiry-detail-panel"
import { getInquiry } from "@/services/inquiries.service"
import { getCurrentBuyer } from "@/utils/dashboard-session"

type BuyerInquiryDetailPageProps = {
  params: Promise<{ id: string }>
}

export default async function BuyerInquiryDetailPage({
  params,
}: BuyerInquiryDetailPageProps) {
  await getCurrentBuyer()
  const { id } = await params
  const inquiry = await getInquiry(id).catch(() => null)

  if (!inquiry) notFound()

  return (
    <div className="space-y-3 sm:space-y-5">
      <DashboardPageHeader
        className="max-sm:hidden"
        title="Inquiry detail"
        description="View your message and the latest seller response."
      />
      <InquiryDetailPanel
        inquiry={inquiry}
        role="buyer"
        backHref={ROUTES.BUYER_INQUIRIES}
      />
    </div>
  )
}

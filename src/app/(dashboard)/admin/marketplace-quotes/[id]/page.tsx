export const dynamic = "force-dynamic"

import { notFound } from "next/navigation"

import { auth } from "@/auth"
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header"
import { ROUTES } from "@/config/routes.config"
import { MarketplaceQuoteDetailPanel } from "@/pages-sections/marketplace-quotes/marketplace-quote-detail-panel"
import { quotesService } from "@/services/quotes.service"

type AdminMarketplaceQuoteDetailPageProps = {
  params: Promise<{ id: string }>
}

export default async function AdminMarketplaceQuoteDetailPage({
  params,
}: AdminMarketplaceQuoteDetailPageProps) {
  const session = await auth()
  const { id } = await params
  const quote = await quotesService.detail(id, session?.accessToken).catch(() => null)

  if (!session?.user || !quote) notFound()

  return (
    <div className="space-y-3 sm:space-y-5">
      <DashboardPageHeader
        className="max-sm:hidden"
        title="Marketplace quote"
        description="Review buyer requirements, supplier routing, and response status."
      />
      <MarketplaceQuoteDetailPanel
        quote={quote}
        token={session.accessToken}
        role="admin"
        backHref={ROUTES.ADMIN_MARKETPLACE_QUOTES}
      />
    </div>
  )
}

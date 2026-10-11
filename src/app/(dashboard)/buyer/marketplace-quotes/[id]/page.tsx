export const dynamic = "force-dynamic"

import { notFound } from "next/navigation"

import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header"
import { ROUTES } from "@/config/routes.config"
import { MarketplaceQuoteDetailPanel } from "@/pages-sections/marketplace-quotes/marketplace-quote-detail-panel"
import { quotesService } from "@/services/quotes.service"
import { auth } from "@/auth"
import { getCurrentBuyer } from "@/utils/dashboard-session"

type BuyerMarketplaceQuoteDetailPageProps = {
  params: Promise<{ id: string }>
}

export default async function BuyerMarketplaceQuoteDetailPage({
  params,
}: BuyerMarketplaceQuoteDetailPageProps) {
  await getCurrentBuyer()
  const session = await auth()
  const { id } = await params
  const quote = await quotesService.detail(id, session?.accessToken).catch(() => null)

  if (!quote) notFound()

  return (
    <div className="space-y-3 sm:space-y-5">
      <DashboardPageHeader
        className="max-sm:hidden"
        title="Marketplace quote"
        description="Track your request details and latest supplier response."
      />
      <MarketplaceQuoteDetailPanel
        quote={quote}
        token={session?.accessToken}
        role="buyer"
        backHref={ROUTES.BUYER_MARKETPLACE_QUOTES}
      />
    </div>
  )
}

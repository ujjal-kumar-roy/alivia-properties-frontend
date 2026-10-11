import type { Metadata } from "next"

import { QuoteThankYou } from "@/components/marketplace/QuoteThankYou"
import { siteConfig } from "@/config/site.config"

export const metadata: Metadata = {
  title: "Quote Request Received - Alivia Marketplace",
  description: "Your quote request has been received. Verified suppliers will reply shortly.",
}

type Props = {
  searchParams: Promise<{ id?: string; batch?: string; count?: string }>
}

export default async function QuoteThankYouPage({ searchParams }: Props) {
  const { id, batch, count } = await searchParams
  const reference = (batch ?? id)?.slice(-8).toUpperCase()
  const supplierCount = count ? Number(count) : 0

  return (
    <main id="main-content" className="bg-linear-to-b from-brand-50/60 via-white to-white">
      <div className="container-page py-5 sm:py-12">
        <QuoteThankYou
          reference={reference}
          supplierCount={Number.isFinite(supplierCount) ? supplierCount : 0}
          phone={siteConfig.contact.phone}
          phoneRaw={siteConfig.contact.phoneRaw}
        />
      </div>
    </main>
  )
}

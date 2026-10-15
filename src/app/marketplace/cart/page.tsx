import type { Metadata } from "next"

import { MarketplaceBreadcrumb } from "@/components/marketplace/MarketplaceBreadcrumb"
import { QuoteListView } from "@/components/marketplace/quote-list/QuoteListView"

export const metadata: Metadata = {
  title: "Your quote list - Alivia Marketplace",
  description:
    "Review the products you picked and ask their sellers for prices in one request. Free, no obligation.",
  // A per-device list: nothing here for search engines.
  robots: { index: false, follow: true },
}

// No server data: the list lives on the visitor's device (localStorage), so
// the page is static and the view renders once it has hydrated.
export default function MarketplaceQuoteListPage() {
  return (
    <main id="main-content" className="bg-linear-to-b from-brand-50/60 via-white to-white">
      <MarketplaceBreadcrumb trail={[{ label: "Quote list" }]} />
      <div className="container-page pb-10 pt-4 sm:pb-16 sm:pt-8">
        <h1 className="font-heading text-2xl font-semibold text-balance text-ink-900 sm:text-3xl">
          Your quote list
        </h1>
        <QuoteListView />
      </div>
    </main>
  )
}

import type { Metadata } from "next"
import Link from "next/link"
import { CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ROUTES } from "@/config/routes.config"
import { siteConfig } from "@/config/site.config"

export const metadata: Metadata = {
  title: "Quote Request Received — Alivia Marketplace",
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
    <main className="bg-linear-to-b from-brand-50/60 via-white to-white">
      <div className="container-page section-y-sm">
        <div className="mx-auto max-w-2xl rounded-[2rem] border border-border/70 bg-white p-7 text-center shadow-(--shadow-card) sm:p-10">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-green-50 text-green-700">
            <CheckCircle2 className="size-9" />
          </div>
          <h1 className="font-heading mt-5 text-2xl font-semibold text-ink-900 sm:text-3xl">
            Quote request sent
          </h1>
          <p className="mt-2 text-sm text-ink-600 sm:text-base">
            {supplierCount > 1
              ? `Thanks — your request was sent to ${supplierCount} suppliers. Most reply within 24 hours via email or phone.`
              : "Thanks — we've routed your request to verified suppliers. Most reply within 24 hours via email or phone."}
          </p>

          {reference && (
            <div className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-4 py-1.5 text-xs font-semibold text-brand-800">
              Reference&nbsp;
              <span className="font-mono tracking-wider">{reference}</span>
            </div>
          )}

          <div className="mt-7 flex flex-col items-center justify-center gap-2 sm:flex-row">
            <Link href={ROUTES.MARKETPLACE}>
              <Button variant="default">Back to marketplace</Button>
            </Link>
            <Link href={ROUTES.MARKETPLACE_REQUEST}>
              <Button variant="outline">Submit another request</Button>
            </Link>
          </div>

          <p className="mt-6 text-xs text-ink-500">
            Need to speak to someone now? Call <span className="font-medium">{siteConfig.contact.phone}</span>.
          </p>
        </div>
      </div>
    </main>
  )
}

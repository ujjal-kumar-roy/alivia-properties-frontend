import type { Metadata } from "next"
import Link from "next/link"
import { ShieldCheck, Sparkles, Timer } from "lucide-react"

import { QuoteWizard } from "@/components/marketplace/wizard/QuoteWizard"
import { marketplaceService, type TreeDepartment } from "@/services/marketplace.service"
import { ROUTES } from "@/config/routes.config"
import { siteConfig } from "@/config/site.config"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Request a Quote - Alivia Marketplace",
  description:
    "Find what you need in a few taps: pick a department, category, and product type, choose suppliers, and request a quote. Free, fast, no obligation.",
}

type Props = {
  searchParams: Promise<{ dept?: string; cat?: string }>
}

export default async function MarketplaceRequestPage({ searchParams }: Props) {
  const params = await searchParams

  let tree: TreeDepartment[] = []
  try {
    tree = await marketplaceService.getTree()
  } catch {
    /* backend unreachable: render the empty state below */
  }

  return (
    <main id="main-content" className="bg-linear-to-b from-brand-50/60 via-white to-white">
      <div className="container-page py-3 md:py-10">
        <nav
          aria-label="Breadcrumb"
          className="mb-5 hidden items-center gap-2 text-sm text-ink-600 md:flex"
        >
          <Link
            href={ROUTES.MARKETPLACE}
            className="inline-flex min-h-9 items-center rounded-full pr-2 hover:text-brand-700"
          >
            Marketplace
          </Link>
          <span aria-hidden="true">›</span>
          <span className="text-ink-900">Book For Consultations</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-start">
          {/* Phones: the guided flow is the page (no card, no big heading).
              From md: the same flow inside a card. */}
          <section className="md:rounded-[2rem] md:border md:border-border/70 md:bg-white md:p-7 md:shadow-(--shadow-card)">
            <header className="mb-6 hidden border-b border-border/60 pb-5 md:block">
              <p className="text-eyebrow mb-2">Marketplace</p>
              <h1 className="font-heading text-2xl font-semibold text-balance text-ink-900 sm:text-3xl">
                Ask for a price in a few taps
              </h1>
              <p className="mt-2 text-sm text-ink-600">
                Tap through a few quick picks, choose sellers, and tell us the details.
              </p>
            </header>
            <h1 className="sr-only md:hidden">Ask for a price in a few taps</h1>

            {tree.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-ink-500">
                The marketplace catalogue is being set up. Please check back shortly, or{" "}
                <a
                  href={`tel:${siteConfig.contact.phoneRaw}`}
                  className="inline-flex min-h-11 items-center font-medium text-brand-700"
                >
                  call our marketplace desk
                </a>
                .
              </div>
            ) : (
              <QuoteWizard
                tree={tree}
                initial={{ dept: params.dept, cat: params.cat }}
              />
            )}
          </section>

          <aside className="hidden space-y-4 md:block lg:sticky lg:top-24">
            <div className="mobile-liquid-glass rounded-[2rem] border border-border/70 bg-white p-5 shadow-(--shadow-card)">
              <p className="text-eyebrow mb-2">Why use the marketplace</p>
              <h2 className="font-heading text-lg font-semibold text-ink-900">
                Verified suppliers. Trackable conversations.
              </h2>
              <ul className="mt-4 space-y-3 text-sm text-ink-700">
                <li className="flex items-start gap-3">
                  <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 text-brand-700" />
                  <div>
                    <p className="font-medium text-ink-900">Verified businesses only</p>
                    <p className="text-xs text-ink-600">
                      Trade licenses and certifications confirmed before listing.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Timer aria-hidden="true" className="mt-0.5 size-5 text-brand-700" />
                  <div>
                    <p className="font-medium text-ink-900">Typical response: 24 hours</p>
                    <p className="text-xs text-ink-600">
                      Most suppliers reply within a business day during working hours.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Sparkles aria-hidden="true" className="mt-0.5 size-5 text-gold-700" />
                  <div>
                    <p className="font-medium text-ink-900">Free, no obligation</p>
                    <p className="text-xs text-ink-600">
                      Send one request to several suppliers. Compare quotes, no commitment.
                    </p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="mobile-liquid-glass rounded-[2rem] border border-border/70 bg-brand-50/60 p-5">
              <p className="text-eyebrow mb-2">Need help?</p>
              <h3 className="font-heading text-base font-semibold text-ink-900">
                Talk to our marketplace team
              </h3>
              <p className="mt-1 text-sm text-ink-700">
                Not sure who to ask? Submit the form and we&apos;ll route it for you.
              </p>
              <p className="mt-3 text-xs text-ink-600">
                Or call <span className="font-medium text-ink-900">{siteConfig.contact.phone}</span>
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}

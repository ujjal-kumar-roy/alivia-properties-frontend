import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Clock, ShieldCheck, Sparkles, Store, TrendingUp } from "lucide-react"

import { PartnerApplicationForm } from "@/components/forms/partner-application-form"
import { siteConfig } from "@/config/site.config"

type PartnerType = "supplier" | "investor"

const TYPES: Record<
  PartnerType,
  {
    icon: typeof Store
    eyebrow: string
    title: string
    lead: string
    /** One line for phones; the full lead shows from sm. */
    short: string
    bullets: { icon: typeof Store; title: string; short: string; desc: string }[]
  }
> = {
  supplier: {
    icon: Store,
    eyebrow: "Become a Partner",
    title: "Be a Supplier",
    lead: "Join Alivia's B2B marketplace and reach buyers who need exactly what you supply. Share a few details and our team will get you onboarded.",
    short: "Reach buyers who need what you supply. Share a few details and we will onboard you.",
    bullets: [
      { icon: ShieldCheck, title: "Verified storefront", short: "Verified storefront", desc: "Get a trusted, verified listing in front of active buyers." },
      { icon: Sparkles, title: "Qualified quote requests", short: "Quote requests", desc: "Receive structured quote requests routed straight to you." },
      { icon: Clock, title: "Fast onboarding", short: "Fast onboarding", desc: "Our team reviews and reaches out, usually within a business day." },
    ],
  },
  investor: {
    icon: TrendingUp,
    eyebrow: "Become a Partner",
    title: "Be an Investor",
    lead: "Invest in Bangladesh real estate with Alivia. Tell us your interest and budget, and our team will share curated opportunities that fit.",
    short: "Tell us your interest and budget. We will share curated opportunities that fit.",
    bullets: [
      { icon: ShieldCheck, title: "RAJUK-registered developer", short: "RAJUK registered", desc: "Invest alongside an established, compliant developer." },
      { icon: Sparkles, title: "Curated opportunities", short: "Curated deals", desc: "Get matched to apartments and properties that fit your goals." },
      { icon: Clock, title: "Personal follow-up", short: "Personal follow-up", desc: "A specialist reaches out to understand your plans." },
    ],
  },
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string }>
}): Promise<Metadata> {
  const { type } = await params
  const t = TYPES[type as PartnerType]
  return {
    title: t ? `${t.title} — Alivia Properties` : "Partner — Alivia Properties",
    description: t?.lead,
  }
}

export default async function PartnerPage({
  params,
}: {
  params: Promise<{ type: string }>
}) {
  const { type } = await params
  if (type !== "supplier" && type !== "investor") notFound()
  const t = TYPES[type]
  const Icon = t.icon

  return (
    <main className="bg-linear-to-b from-brand-50/60 via-white to-white">
      <div className="container-page py-4 sm:py-8 lg:py-12">
        <div className="grid gap-3.5 lg:grid-cols-[1.3fr_1fr] lg:items-start lg:gap-8">
          <section className="rounded-2xl border border-black/5 bg-white p-3.5 shadow-(--shadow-card) sm:p-7">
            <header className="enter-cascade mb-3.5 border-b border-border/60 pb-3.5 sm:mb-5 sm:pb-5">
              <div className="flex items-center gap-3 sm:block">
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 sm:size-11">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <p className="text-eyebrow mt-3 hidden sm:block">{t.eyebrow}</p>
                  <h1 className="font-heading text-xl font-bold tracking-tight text-balance text-ink-900 sm:text-3xl">
                    {t.title}
                  </h1>
                </div>
              </div>
              <p className="mt-2 text-[0.9375rem] leading-snug text-ink-600 sm:hidden">{t.short}</p>
              <p className="mt-2 hidden text-sm text-ink-600 sm:block">{t.lead}</p>

              {/* Phones: the three promises as small pills, in place of the side card. */}
              <ul className="mt-2.5 flex flex-wrap gap-1.5 sm:hidden">
                {t.bullets.map((b) => {
                  const BIcon = b.icon
                  return (
                    <li
                      key={b.title}
                      className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800"
                    >
                      <BIcon aria-hidden="true" className="size-3.5" />
                      {b.short}
                    </li>
                  )
                })}
              </ul>
            </header>

            <PartnerApplicationForm type={type} />
          </section>

          <aside className="space-y-3 lg:sticky lg:top-24 lg:space-y-4">
            <div className="hidden rounded-2xl border border-black/5 bg-white p-5 shadow-(--shadow-card) sm:block">
              <p className="text-eyebrow mb-3">Why partner with Alivia</p>
              <ul className="reveal-stagger space-y-3 text-sm text-ink-700">
                {t.bullets.map((b) => {
                  const BIcon = b.icon
                  return (
                    <li key={b.title} className="flex items-start gap-3">
                      <BIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand-700" />
                      <div>
                        <p className="font-medium text-ink-900">{b.title}</p>
                        <p className="text-xs text-ink-600">{b.desc}</p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>

            <div className="rounded-2xl border border-border/70 bg-brand-50/60 p-3.5 sm:p-5">
              <p className="text-eyebrow mb-1.5 hidden sm:mb-2 sm:block">Prefer to talk?</p>
              <p className="text-[0.9375rem] leading-snug text-ink-700 sm:text-sm">
                Submit the form and we&apos;ll route it to the right team, or call{" "}
                <a
                  href={`tel:${siteConfig.contact.phoneRaw}`}
                  className="inline-block py-1.5 -my-1.5 font-semibold text-brand-800 underline underline-offset-2"
                >
                  {siteConfig.contact.phone}
                </a>
                .
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}

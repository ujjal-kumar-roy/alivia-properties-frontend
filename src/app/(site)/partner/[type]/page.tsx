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
    bullets: { icon: typeof Store; title: string; desc: string }[]
  }
> = {
  supplier: {
    icon: Store,
    eyebrow: "Become a Partner",
    title: "Be a Supplier",
    lead: "Join Alivia's B2B marketplace and reach buyers who need exactly what you supply. Share a few details and our team will get you onboarded.",
    bullets: [
      { icon: ShieldCheck, title: "Verified storefront", desc: "Get a trusted, verified listing in front of active buyers." },
      { icon: Sparkles, title: "Qualified quote requests", desc: "Receive structured quote requests routed straight to you." },
      { icon: Clock, title: "Fast onboarding", desc: "Our team reviews and reaches out, usually within a business day." },
    ],
  },
  investor: {
    icon: TrendingUp,
    eyebrow: "Become a Partner",
    title: "Be an Investor",
    lead: "Invest in Bangladesh real estate with Alivia. Tell us your interest and budget, and our team will share curated opportunities that fit.",
    bullets: [
      { icon: ShieldCheck, title: "RAJUK-registered developer", desc: "Invest alongside an established, compliant developer." },
      { icon: Sparkles, title: "Curated opportunities", desc: "Get matched to apartments and properties that fit your goals." },
      { icon: Clock, title: "Personal follow-up", desc: "A specialist reaches out to understand your plans." },
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
      <div className="container-page section-y-sm">
        <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-start">
          <section className="surface-card p-5 sm:p-7">
            <header className="mb-5 border-b border-border/60 pb-5">
              <span className="inline-flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <Icon className="size-5" />
              </span>
              <p className="text-eyebrow mt-3">{t.eyebrow}</p>
              <h1 className="font-heading text-2xl font-semibold text-balance text-ink-900 sm:text-3xl">
                {t.title}
              </h1>
              <p className="mt-2 text-sm text-ink-600">{t.lead}</p>
            </header>

            <PartnerApplicationForm type={type} />
          </section>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="surface-card p-5">
              <p className="text-eyebrow mb-3">Why partner with Alivia</p>
              <ul className="space-y-3 text-sm text-ink-700">
                {t.bullets.map((b) => {
                  const BIcon = b.icon
                  return (
                    <li key={b.title} className="flex items-start gap-3">
                      <BIcon className="mt-0.5 size-5 shrink-0 text-brand-700" />
                      <div>
                        <p className="font-medium text-ink-900">{b.title}</p>
                        <p className="text-xs text-ink-600">{b.desc}</p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>

            <div className="rounded-2xl border border-border/70 bg-brand-50/60 p-5">
              <p className="text-eyebrow mb-2">Prefer to talk?</p>
              <p className="text-sm text-ink-700">
                Submit the form and we&apos;ll route it to the right team — or call{" "}
                <span className="font-medium text-ink-900">{siteConfig.contact.phone}</span>.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}

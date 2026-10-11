import { PreApprovalForm } from "@/components/forms/pre-approval-form"
import { ShieldCheck, Clock, BadgeDollarSign } from "lucide-react"

export const metadata = {
  title: "Mortgage Pre-Approval — Alivia Properties",
  description: "Estimate your eligibility against partner banks in seconds.",
}

const BENEFITS = [
  { icon: Clock, label: "Instant indicative offer", short: "Instant offer" },
  { icon: BadgeDollarSign, label: "Compare 7 partner banks", short: "Compare banks" },
  { icon: ShieldCheck, label: "No credit-bureau hit", short: "No credit check" },
]

export default function PreApprovalPage() {
  return (
    <div className="py-4 sm:py-8 lg:py-12">
      <div className="container-page grid gap-3.5 lg:grid-cols-5 lg:gap-10">
        <aside className="space-y-3 lg:col-span-2 lg:space-y-6">
          <div>
            <p className="text-eyebrow mb-2 hidden sm:block">Financing</p>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl lg:text-4xl">
              Mortgage pre-approval
            </h1>
            <p className="mt-1.5 text-[0.9375rem] leading-snug text-ink-600 sm:hidden">
              Get an indicative offer in seconds. No commitment.
            </p>
            <p className="mt-2 hidden text-sm leading-relaxed text-muted-foreground sm:block">
              Indicative result in 5 seconds based on income &amp; DTI. No credit pull, no commitment. We pick the best partner-bank rate for your profile.
            </p>
          </div>

          {/* Phones: the three promises as small pills, not a list. */}
          <ul className="flex flex-wrap gap-1.5 lg:hidden">
            {BENEFITS.map(({ icon: Icon, short }) => (
              <li
                key={short}
                className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-800"
              >
                <Icon aria-hidden="true" className="size-3.5" />
                {short}
              </li>
            ))}
          </ul>
          <ul className="hidden space-y-3 text-sm lg:block">
            {BENEFITS.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2.5">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                  <Icon aria-hidden="true" className="h-3.5 w-3.5" />
                </span>
                <span className="text-ink-800">{label}</span>
              </li>
            ))}
          </ul>
        </aside>
        <div className="lg:col-span-3">
          <PreApprovalForm />
        </div>
      </div>
    </div>
  )
}

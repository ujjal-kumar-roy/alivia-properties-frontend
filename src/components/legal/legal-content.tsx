import type { ReactNode } from "react"
import { AlertTriangle, Info, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Small presentational primitives shared by /privacy and /terms so both
 * documents read with one consistent rhythm. Deliberately not data-driven —
 * each page writes its own sections as plain JSX (legal copy gets edited by
 * hand later; a generic content array would make that harder, not easier).
 *
 * Body copy is 16px on every screen. Links inside list items get a taller hit
 * area (padding cancelled by a negative margin, so the lines do not move).
 */

export function LegalSection({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: ReactNode
}) {
  return (
    <section
      id={id}
      className="scroll-mt-28 border-t border-border pt-6 first:mt-0 first:border-t-0 first:pt-0 sm:pt-10 md:scroll-mt-32 [&:not(:first-child)]:mt-6 sm:[&:not(:first-child)]:mt-10"
    >
      <h2 className="mb-3 font-heading text-xl font-bold leading-snug tracking-tight text-ink-900 sm:mb-4 sm:text-2xl md:text-3xl">
        {title}
      </h2>
      <div className="space-y-3.5 sm:space-y-4">{children}</div>
    </section>
  )
}

export function LegalSubHeading({ children }: { children: ReactNode }) {
  return <h3 className="pt-2 text-base font-bold text-ink-900">{children}</h3>
}

export function LegalP({ children }: { children: ReactNode }) {
  return <p className="text-base leading-relaxed text-ink-700">{children}</p>
}

export function LegalUl({ children }: { children: ReactNode }) {
  return (
    <ul className="list-disc space-y-2 pl-5 text-base leading-relaxed text-ink-700 marker:text-brand-400 [&_a]:-my-1.5 [&_a]:inline-block [&_a]:py-1.5">
      {children}
    </ul>
  )
}

const CALLOUT_STYLES: Record<"notice" | "caution", { wrap: string; icon: string; Icon: LucideIcon }> = {
  notice: { wrap: "border-brand-100 bg-brand-50/70", icon: "bg-brand-100 text-brand-700", Icon: Info },
  caution: { wrap: "border-amber-200 bg-amber-50", icon: "bg-amber-100 text-amber-800", Icon: AlertTriangle },
}

export function LegalCallout({
  variant = "notice",
  title,
  children,
}: {
  variant?: "notice" | "caution"
  title: string
  children: ReactNode
}) {
  const { wrap, icon, Icon } = CALLOUT_STYLES[variant]
  return (
    <div className={cn("flex gap-3 rounded-xl border p-3.5 sm:p-4", wrap)}>
      <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", icon)}>
        <Icon className="size-4" aria-hidden="true" />
      </div>
      <div className="min-w-0 space-y-1">
        <p className="text-[0.9375rem] font-bold text-ink-900">{title}</p>
        <div className="space-y-2 text-[0.9375rem] leading-relaxed text-ink-700">{children}</div>
      </div>
    </div>
  )
}

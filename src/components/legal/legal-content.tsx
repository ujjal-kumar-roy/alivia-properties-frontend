import type { ReactNode } from "react"
import { AlertTriangle, Info, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Small presentational primitives shared by /privacy and /terms so both
 * documents read with one consistent rhythm. Deliberately not data-driven —
 * each page writes its own sections as plain JSX (legal copy gets edited by
 * hand later; a generic content array would make that harder, not easier).
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
      className="scroll-mt-28 border-t border-border pt-10 first:mt-0 first:border-t-0 first:pt-0 md:scroll-mt-32"
    >
      <h2 className="text-h3 mb-4">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

export function LegalSubHeading({ children }: { children: ReactNode }) {
  return <h3 className="pt-2 text-base font-bold text-ink-900">{children}</h3>
}

export function LegalP({ children }: { children: ReactNode }) {
  return <p className="text-[0.95rem] leading-relaxed text-ink-700">{children}</p>
}

export function LegalUl({ children }: { children: ReactNode }) {
  return (
    <ul className="list-disc space-y-2 pl-5 text-[0.95rem] leading-relaxed text-ink-700 marker:text-brand-400">
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
    <div className={cn("flex gap-3 rounded-xl border p-4", wrap)}>
      <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", icon)}>
        <Icon className="size-4" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-bold text-ink-900">{title}</p>
        <div className="space-y-2 text-sm leading-relaxed text-ink-700">{children}</div>
      </div>
    </div>
  )
}

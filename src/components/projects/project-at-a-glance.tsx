import {
  Bath,
  BedDouble,
  Building2,
  CalendarCheck2,
  CircleCheck,
  Home,
  Layers3,
  MapPin,
  Ruler,
  Tag,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { ProjectFact, ProjectFactKey } from "./project-facts"

const FACT_ICONS: Record<ProjectFactKey, LucideIcon> = {
  address: MapPin,
  landArea: Layers3,
  floors: Building2,
  totalUnits: Home,
  availableUnits: CircleCheck,
  soldUnits: Tag,
  unitSize: Ruler,
  bedrooms: BedDouble,
  bathrooms: Bath,
  handover: CalendarCheck2,
}

type ProjectAtAGlanceProps = {
  facts: ProjectFact[]
  /**
   * `card` is the desktop sidebar card (heading plus a two column table).
   * `grid` is the compact phone version: two columns of small fact tiles, no
   * heading of its own (the accordion title above it says what it is).
   */
  variant?: "card" | "grid"
}

export function ProjectAtAGlance({ facts, variant = "card" }: ProjectAtAGlanceProps) {
  if (facts.length === 0) return null

  if (variant === "grid") {
    return (
      <dl className="grid grid-cols-2 gap-1.5">
        {facts.map((fact) => {
          const Icon = FACT_ICONS[fact.key]
          return (
            <div
              key={fact.key}
              className={cn(
                "min-w-0 rounded-xl bg-ink-50 px-2.5 py-2",
                fact.key === "address" && "col-span-2",
              )}
            >
              <dt className="flex items-center gap-1.5 text-xs font-medium text-ink-500">
                <Icon aria-hidden="true" className="size-3.5 shrink-0 text-brand-600" />
                {fact.label}
              </dt>
              <dd className="mt-0.5 text-sm leading-snug font-semibold text-ink-900">{fact.value}</dd>
            </div>
          )
        })}
      </dl>
    )
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
      <div className="border-b border-border px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
          Essential details
        </p>
        <h2 className="mt-1 text-xl font-bold text-ink-900">Apartment at a glance</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">Key facts about this apartment</caption>
          <thead>
            <tr className="border-b border-border bg-ink-100/60 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              <th
                scope="col"
                className="w-[43%] border-r border-border px-4 py-2.5 font-semibold"
              >
                Detail
              </th>
              <th scope="col" className="px-4 py-2.5 font-semibold">
                Information
              </th>
            </tr>
          </thead>
          <tbody>
            {facts.map((fact) => {
              const Icon = FACT_ICONS[fact.key]
              return (
                <tr key={fact.key} className="border-b border-border/70 last:border-b-0">
                  <th
                    scope="row"
                    className="w-[43%] border-r border-border/70 bg-ink-50/70 px-4 py-3 align-top font-medium text-muted-foreground"
                  >
                    <span className="flex items-start gap-2">
                      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand-600" />
                      <span>{fact.label}</span>
                    </span>
                  </th>
                  <td className="px-4 py-3 align-top font-semibold leading-5 text-ink-900">
                    {fact.value}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

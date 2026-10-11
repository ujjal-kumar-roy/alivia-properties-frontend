import { Bath, BedDouble, Maximize2 } from "lucide-react"
import { CardFact } from "@/components/common/card-fact"
import type { ProjectUnit } from "@/types/project.types"
import { unitPriceText } from "./project-detail.utils"

function unitName(unit: ProjectUnit): string {
  return unit.type ?? unit.name ?? "Unit"
}

function unitSize(unit: ProjectUnit): string | null {
  return unit.size != null
    ? `${unit.size.toLocaleString("en-BD")} ${unit.sizeUnit ?? "sq ft"}`
    : null
}

/**
 * Availability for one unit type, from real numbers only. The API sends how
 * many of a type are still available; a total per type exists on some older
 * records, so "3 of 5" is shown only when both numbers are really there.
 */
function Availability({ unit }: { unit: ProjectUnit }) {
  if (unit.available == null) return null
  const soldOut = unit.available <= 0
  const text = soldOut
    ? "Sold out"
    : unit.total != null && unit.total >= unit.available
      ? `${unit.available} of ${unit.total} available`
      : `${unit.available} available`

  return (
    <span
      className={
        soldOut
          ? "inline-flex rounded-full bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-600"
          : "inline-flex rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-800"
      }
    >
      {text}
    </span>
  )
}

/**
 * Unit types and prices. Phones get one compact card per type (name and price
 * on top, beds, baths and size under it, availability last); from `md` the same
 * data is the familiar table.
 */
export function ProjectUnitTypes({ units }: { units: ProjectUnit[] }) {
  return (
    <>
      <ul className="space-y-2 md:hidden">
        {units.map((unit, index) => {
          const price = unitPriceText(unit)
          const size = unitSize(unit)
          return (
            <li
              key={unit.id ?? `${unitName(unit)}-${index}`}
              className="rounded-xl border border-ink-100 bg-ink-50/60 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="min-w-0 font-heading text-[0.95rem] leading-snug font-semibold text-ink-900">
                  {unitName(unit)}
                </h3>
                {price ? (
                  <p className="shrink-0 text-[0.95rem] leading-snug font-extrabold tabular-nums text-gold-700">
                    {price}
                  </p>
                ) : null}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                <ul className="flex flex-wrap gap-x-3 gap-y-1">
                  {unit.bedrooms != null ? (
                    <li>
                      <CardFact icon={BedDouble}>{unit.bedrooms} Bed</CardFact>
                    </li>
                  ) : null}
                  {unit.bathrooms != null ? (
                    <li>
                      <CardFact icon={Bath}>{unit.bathrooms} Bath</CardFact>
                    </li>
                  ) : null}
                  {size ? (
                    <li>
                      <CardFact icon={Maximize2}>{size}</CardFact>
                    </li>
                  ) : null}
                </ul>
                <Availability unit={unit} />
              </div>
            </li>
          )
        })}
      </ul>

      <div className="hidden overflow-x-auto rounded-xl border border-border [scrollbar-color:var(--color-brand-300)_transparent] [scrollbar-width:thin] md:block">
        <table className="w-full text-sm">
          <caption className="sr-only">Unit types and prices</caption>
          <thead className="bg-ink-50 text-xs uppercase text-muted-foreground">
            <tr>
              {["Type", "Beds", "Baths", "Size", "Price", "Availability"].map((heading) => (
                <th
                  key={heading}
                  scope="col"
                  className="px-4 py-2.5 text-left font-semibold whitespace-nowrap"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {units.map((unit, index) => (
              <tr key={unit.id ?? `${unitName(unit)}-${index}`} className="hover:bg-ink-50">
                <th scope="row" className="min-w-36 px-4 py-3 text-left font-medium">
                  {unitName(unit)}
                </th>
                <td className="px-4 py-3 text-muted-foreground tabular-nums">
                  {unit.bedrooms ?? "-"}
                </td>
                <td className="px-4 py-3 text-muted-foreground tabular-nums">
                  {unit.bathrooms ?? "-"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground tabular-nums">
                  {unitSize(unit) ?? "-"}
                </td>
                <td className="px-4 py-3 font-semibold whitespace-nowrap text-brand-700 tabular-nums">
                  {unitPriceText(unit) ?? "On request"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <Availability unit={unit} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

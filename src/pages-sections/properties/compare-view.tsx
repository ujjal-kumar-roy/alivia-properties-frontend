"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Check, House, Plus, X } from "lucide-react"
import { useCompareProperties } from "@/hooks/use-compare-properties"
import { MAX_COMPARE_ITEMS } from "@/lib/constants"
import { CARD_BLUR_DATA_URL } from "@/lib/image-placeholder"
import { ROUTES } from "@/config/routes.config"
import {
  formatFloor,
  formatPropertySize,
  getPropertyPrice,
  listedAgo,
  propertyTypeLabel,
} from "@/components/properties/property-facts"
import { propertiesService } from "@/services/properties.service"
import type { Property } from "@/types/property.types"

type Row = {
  key: string
  label: string
  value: (p: Property) => string
  /** Marks the best value in the row (lowest price, largest size). */
  best?: (props: Property[]) => string | null
  bold?: boolean
}

const dash = "-"

export function CompareView() {
  const { list, snapshots, ready, remove, clear, refreshSnapshots } = useCompareProperties()
  const refreshed = useRef(false)

  // The list holds ids, but the public lookup is by slug: show the saved copy at
  // once, then refresh every listing from the API so prices are current.
  useEffect(() => {
    if (!ready || refreshed.current || list.length === 0) return
    refreshed.current = true
    const targets = list.map((id) => snapshots[id]).filter(Boolean)
    void Promise.allSettled(targets.map((s) => propertiesService.bySlug(s.slug))).then((results) => {
      const fresh: Record<string, Property> = {}
      for (const r of results) if (r.status === "fulfilled") fresh[r.value.id] = r.value
      refreshSnapshots(fresh)
    })
  }, [ready, list, snapshots, refreshSnapshots])

  if (!ready) {
    return (
      <div aria-hidden="true" className="space-y-2">
        <div className="skeleton h-9 w-48 rounded-full" />
        <div className="skeleton h-72 w-full rounded-2xl" />
      </div>
    )
  }

  if (list.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center sm:py-20">
        <p className="text-sm font-medium text-ink-700">No properties selected for comparison.</p>
        <p className="mt-1 text-xs text-ink-500">Use the compare button on any listing to add it here.</p>
        <Link href={ROUTES.PROPERTIES} className="btn-tactile btn-tactile--sm mt-5">
          Browse listings
        </Link>
      </div>
    )
  }

  const columns = list.map((id) => ({ id, property: snapshots[id] as Property | undefined }))
  const known = columns.map((c) => c.property).filter(Boolean) as Property[]
  const samePurpose = known.length > 1 && known.every((p) => p.purpose === known[0].purpose)
  const sameUnit = known.length > 1 && known.every((p) => p.sizeUnit === known[0].sizeUnit)

  const ROWS: Row[] = [
    {
      key: "price",
      label: "Price",
      bold: true,
      value: (p) => {
        const price = getPropertyPrice(p)
        return `${price.amount}${price.per ?? ""}`
      },
      best: (props) => {
        if (!samePurpose) return null
        const lowest = props.reduce((a, b) => (b.price < a.price ? b : a))
        return props.every((p) => p.price === lowest.price) ? null : lowest.id
      },
    },
    { key: "purpose", label: "Purpose", value: (p) => (p.purpose === "rent" ? "For rent" : "For sale") },
    { key: "type", label: "Type", value: (p) => propertyTypeLabel(p.type) },
    { key: "location", label: "Location", value: (p) => `${p.area}, ${p.district}` },
    { key: "division", label: "Division", value: (p) => p.division },
    {
      key: "size",
      label: "Size",
      value: (p) => formatPropertySize(p.size, p.sizeUnit),
      best: (props) => {
        if (!sameUnit) return null
        const largest = props.reduce((a, b) => (b.size > a.size ? b : a))
        return props.every((p) => p.size === largest.size) ? null : largest.id
      },
    },
    { key: "bed", label: "Bedrooms", value: (p) => (p.bedrooms ? String(p.bedrooms) : dash) },
    { key: "bath", label: "Bathrooms", value: (p) => (p.bathrooms ? String(p.bathrooms) : dash) },
    { key: "floor", label: "Floor", value: (p) => formatFloor(p) ?? dash },
    { key: "parking", label: "Parking", value: (p) => (p.parkingSpots ? String(p.parkingSpots) : dash) },
    { key: "year", label: "Year built", value: (p) => (p.yearBuilt ? String(p.yearBuilt) : dash) },
    { key: "pricing", label: "Pricing", value: (p) => (p.priceNegotiable ? "Negotiable" : "Fixed") },
    { key: "verified", label: "Verified", value: (p) => (p.isVerified ? "Yes" : "No") },
    { key: "listed", label: "Listed", value: (p) => listedAgo(p.createdAt) ?? dash },
  ]

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-ink-600">
          <span className="font-bold text-ink-900">{list.length}</span> of {MAX_COMPARE_ITEMS} selected
        </p>
        <div className="flex items-center gap-2">
          {list.length < MAX_COMPARE_ITEMS && (
            <Link href={ROUTES.PROPERTIES} className="btn-glass min-h-9 text-xs">
              <Plus aria-hidden="true" className="size-3.5" />
              Add more
            </Link>
          )}
          <button type="button" onClick={clear} className="btn-glass min-h-9 text-xs">
            Clear all
          </button>
        </div>
      </div>

      {/* The table scrolls sideways inside its own box; the attribute column stays put. */}
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {/* Fixed layout: every listing gets an equal column, wide enough on phones
            (9rem) that the table scrolls instead of squeezing. */}
        <table
          className="w-full table-fixed border-separate border-spacing-0 text-sm"
          style={{ minWidth: `calc(5.5rem + ${columns.length} * 9rem)` }}
        >
          <colgroup>
            <col className="w-22" />
            {columns.map(({ id }) => (
              <col key={id} className="w-36 sm:w-auto" />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className="p-0">
                <span className="sr-only">Attribute</span>
              </th>
              {columns.map(({ id, property: p }) => (
                <th key={id} scope="col" className="p-1.5 align-top font-normal sm:p-2">
                  <div className="relative aspect-4/3 overflow-hidden rounded-xl bg-ink-100 sm:aspect-16/10">
                    {p?.images[0] ? (
                      <Image
                        src={p.images[0]}
                        alt=""
                        fill
                        sizes="(min-width: 640px) 240px, 144px"
                        placeholder="blur"
                        blurDataURL={CARD_BLUR_DATA_URL}
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-brand-200">
                        <House aria-hidden="true" className="size-8" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => remove(id)}
                      aria-label={`Remove ${p?.title ?? "listing"} from compare`}
                      className="btn-glass absolute right-1 top-1 size-9 min-h-9 min-w-9 !p-0"
                    >
                      <X aria-hidden="true" className="size-4" />
                    </button>
                  </div>
                  {p ? (
                    <Link
                      href={ROUTES.PROPERTY_DETAIL(p.slug)}
                      className="mt-1.5 line-clamp-2 block text-left text-xs font-semibold leading-snug text-ink-900 hover:text-brand-700 sm:text-sm"
                    >
                      {p.title}
                    </Link>
                  ) : (
                    <p className="mt-1.5 text-left text-xs text-ink-500">Details are no longer saved. Remove it and add it again.</p>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, i) => {
              const zebra = i % 2 === 0
              const bestId = known.length > 1 ? row.best?.(known) : null
              return (
                <tr key={row.key}>
                  <th
                    scope="row"
                    className={
                      "sticky left-0 z-10 border-b border-border/50 p-2 text-left text-xs font-medium text-ink-500 " +
                      (zebra ? "bg-ink-50" : "bg-white")
                    }
                  >
                    {row.label}
                  </th>
                  {columns.map(({ id, property: p }) => {
                    const isBest = p != null && bestId === p.id
                    return (
                      <td
                        key={id}
                        className={
                          "border-b border-border/50 p-2 text-xs text-ink-800 sm:text-sm " +
                          (zebra ? "bg-ink-50/60 " : "bg-white ") +
                          (row.bold ? "font-extrabold tabular-nums text-gold-700 " : "") +
                          (isBest ? "!text-brand-700 font-bold" : "")
                        }
                      >
                        <span className="inline-flex items-center gap-1">
                          {p ? row.value(p) : dash}
                          {isBest && (
                            <Check aria-label="Best in this row" role="img" className="size-3.5 shrink-0" />
                          )}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
            <tr>
              <th scope="row" className="sticky left-0 z-10 bg-white p-2">
                <span className="sr-only">Open listing</span>
              </th>
              {columns.map(({ id, property: p }) => (
                <td key={id} className="p-2">
                  {p ? (
                    <Link href={ROUTES.PROPERTY_DETAIL(p.slug)} className="btn-glass min-h-10 w-full text-xs">
                      View
                      <ArrowRight aria-hidden="true" className="size-3.5" />
                    </Link>
                  ) : null}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

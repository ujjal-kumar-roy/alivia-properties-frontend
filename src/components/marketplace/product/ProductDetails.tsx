import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  FileText,
  MapPin,
  ShieldCheck,
  Store,
  TrendingUp,
  Truck,
} from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

import { MediaImage } from "@/components/marketplace/MediaImage"
import { supplierInitials } from "@/components/marketplace/supplier-media-utils"
import { ROUTES } from "@/config/routes.config"
import { cn } from "@/lib/utils"
import type { ProductWithSupplier } from "@/services/marketplace.service"
import type { ProductVariant } from "@/types/marketplace.types"
import { formatTaka } from "@/utils/format-price"

import { ReadMore } from "./ReadMore"
import type { DetailSupplier } from "./types"

type ProductDetailsProps = {
  product: ProductWithSupplier
  supplier?: DetailSupplier
  serviceMode: boolean
}

/** Text past this many characters collapses behind "Read more". */
const LONG_TEXT_CHARS = 600
const MAX_AREA_CHIPS = 8

const h2 = "font-sans text-lg font-extrabold text-ink-900 md:text-xl"
const h3 = "font-sans text-sm font-extrabold text-ink-900"
const section = "border-t border-ink-200 pt-6"
const pressable =
  "transition-[scale,background-color,border-color] duration-140 ease-(--ease-out) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 active:scale-[0.97] motion-reduce:transition-colors motion-reduce:active:scale-100"

type Row = { label: string; value: string }

/** Only http(s) and same-site links: document URLs come from seller-entered data. */
function safeHref(url: string): string | null {
  return /^(https?:\/\/|\/(?!\/))/i.test(url.trim()) ? url.trim() : null
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`
}

function variantMeta(variant: ProductVariant) {
  return (variant.specs ?? [])
    // A service package tagged "SERVICE" says nothing the page does not already say.
    .filter((spec) => !(spec.key === "materialType" && spec.value.toUpperCase() === "SERVICE"))
    .map((spec) => `${spec.value}${spec.unit ? ` ${spec.unit}` : ""}`)
    .filter(Boolean)
    .join(" / ")
}

/** Everything the seller filled in, as label/value rows. Blank values are skipped. */
function buildRows(product: ProductWithSupplier, serviceMode: boolean): Row[] {
  const rows: Row[] = []
  const taken = new Set<string>()
  const push = (label: string, value?: string | null) => {
    const text = value?.trim()
    if (!text || taken.has(label.toLowerCase())) return
    taken.add(label.toLowerCase())
    rows.push({ label, value: text })
  }

  push(serviceMode ? "Team" : "Brand", product.brand)
  push("Unit", product.unit) // shown as the seller typed it ("Pcs", "pcs", "unit")
  if (product.moq && product.moq > 0) {
    push(serviceMode ? "Minimum booking" : "Minimum order", `${product.moq} ${product.unit}`)
  }
  if (product.leadTimeDays && product.leadTimeDays > 0) {
    push(serviceMode ? "Visit lead time" : "Lead time", plural(product.leadTimeDays, "day"))
  }
  push("SKU", product.sku)
  push("Warranty", product.warranty)
  push("Origin", product.origin)
  push("Packaging", product.packaging)
  if (product.certifications && product.certifications.length > 0) {
    push("Certifications", product.certifications.join(", "))
  }
  for (const spec of product.specs ?? []) {
    push(spec.label, `${spec.value}${spec.unit ? ` ${spec.unit}` : ""}`)
  }
  return rows
}

/**
 * The body of a product page below the buy box: description, details table,
 * bulk pricing / documents / options when the seller provided them, and the
 * seller panel. Plain headings, no accordions; sparse products simply get a
 * shorter page.
 */
export function ProductDetails({ product, supplier, serviceMode }: ProductDetailsProps) {
  const lead = product.shortDescription?.trim() ?? ""
  const body = product.description?.trim() ?? ""
  const showBody = Boolean(body) && body !== lead
  const highlights = (product.highlights ?? []).filter((item) => item.trim())
  const hasAbout = Boolean(lead) || showBody || highlights.length > 0

  const rows = buildRows(product, serviceMode)
  const tiers = [...(product.priceTiers ?? [])].sort((a, b) => a.minQty - b.minQty)
  const documents = (product.documents ?? [])
    .map((doc) => ({ label: doc.label, href: safeHref(doc.url) }))
    .filter((doc): doc is { label: string; href: string } => doc.href !== null)
  const variants = (product.variants ?? []).filter((variant) => variant.isActive !== false)

  const quoteHref = (variantId: string) => {
    const params = new URLSearchParams({ productId: product.id, productSlug: product.slug })
    if (supplier) params.set("supplierSlug", supplier.slug)
    params.set("variantId", variantId)
    return `${ROUTES.MARKETPLACE_QUOTE}?${params.toString()}`
  }

  const aboutText: ReactNode = (
    <div className="max-w-[70ch] text-[0.9375rem] leading-relaxed text-ink-700 sm:text-base">
      {lead ? <p className="whitespace-pre-line font-semibold text-ink-900">{lead}</p> : null}
      {showBody ? <p className={cn("whitespace-pre-line", lead && "mt-2")}>{body}</p> : null}
      {highlights.length > 0 ? (
        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {highlights.map((item, index) => (
            <li key={index} className="flex items-start gap-2">
              <CheckCircle2 aria-hidden="true" className="mt-1 size-3.5 shrink-0 text-brand-600" />
              {item}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-x-10">
      <div className="min-w-0 space-y-8">
        {hasAbout ? (
          <section aria-labelledby="pd-about" className={section}>
            <h2 id="pd-about" className={h2}>
              {serviceMode ? "About this service" : "About this product"}
            </h2>
            <div className="mt-3">
              {lead.length + (showBody ? body.length : 0) > LONG_TEXT_CHARS ? <ReadMore>{aboutText}</ReadMore> : aboutText}
            </div>
          </section>
        ) : null}

        <section aria-labelledby="pd-details" className={section}>
          <h2 id="pd-details" className={h2}>
            {serviceMode ? "Service details" : "Product details"}
          </h2>
          <dl className="mt-3 divide-y divide-ink-200 border-y border-ink-200 text-sm sm:text-[0.9375rem]">
            {rows.map((row) => (
              <div key={row.label} className="grid grid-cols-[minmax(6.5rem,9rem)_minmax(0,1fr)] gap-x-4 py-2.5">
                <dt className="text-ink-500">{row.label}</dt>
                <dd className="min-w-0 font-medium text-ink-900 [overflow-wrap:anywhere]">{row.value}</dd>
              </div>
            ))}
          </dl>

          {tiers.length > 0 ? (
            <div className="mt-8">
              <h3 className={h3}>Bulk pricing</h3>
              <table className="mt-2 w-full text-sm">
                <caption className="sr-only">Price per {product.unit} by order quantity</caption>
                <thead>
                  <tr className="text-left text-xs text-ink-500">
                    <th scope="col" className="pb-2 font-medium">
                      Quantity
                    </th>
                    <th scope="col" className="pb-2 text-right font-medium">
                      Price per {product.unit}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-200 border-y border-ink-200">
                  {tiers.map((tier, index) => (
                    <tr key={index}>
                      <td className="py-2.5 pr-3 text-ink-700">
                        {tier.minQty}
                        {tier.maxQty ? `–${tier.maxQty}` : "+"} {product.unit}
                        {tier.note ? <span className="block text-xs text-ink-500">{tier.note}</span> : null}
                      </td>
                      <td className="py-2.5 text-right font-bold tabular-nums text-ink-900">
                        {tier.price > 0 ? formatTaka(tier.price) : "Ask for price"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {documents.length > 0 ? (
            <div className="mt-8">
              <h3 className={h3}>Documents</h3>
              <ul className="mt-2 divide-y divide-ink-200 border-y border-ink-200">
                {documents.map((doc, index) => (
                  <li key={index}>
                    <a
                      href={doc.href}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-h-11 items-center gap-2.5 rounded-lg px-1 py-2 text-sm font-medium text-ink-900 transition-colors duration-140 ease-(--ease-out) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-400 [@media(hover:hover)_and_(pointer:fine)]:hover:text-brand-700"
                    >
                      <FileText aria-hidden="true" className="size-4 shrink-0 text-brand-600" />
                      <span className="min-w-0 flex-1 truncate">{doc.label}</span>
                      <ArrowUpRight aria-hidden="true" className="size-4 shrink-0 text-ink-400" />
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {variants.length > 0 ? (
            <div className="mt-8">
              <h3 className={h3}>{serviceMode ? "Packages" : "Options"}</h3>
              <ul className="mt-2 divide-y divide-ink-200 border-y border-ink-200">
                {variants.map((variant) => {
                  const meta = variantMeta(variant)
                  return (
                    <li key={variant.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink-900">{variant.name}</p>
                        {meta ? <p className="mt-0.5 text-xs text-ink-500">{meta}</p> : null}
                        {variant.price && variant.price > 0 ? (
                          <p className="mt-0.5 text-xs font-semibold tabular-nums text-ink-700">
                            {formatTaka(variant.price)}
                            {variant.unit ? ` / ${variant.unit}` : ""}
                          </p>
                        ) : null}
                      </div>
                      <Link
                        href={quoteHref(variant.id)}
                        aria-label={`Ask for price: ${variant.name}`}
                        className={cn(
                          "inline-flex min-h-11 shrink-0 items-center rounded-full border border-brand-600/30 px-4 text-sm font-semibold text-brand-700 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-brand-50",
                          pressable,
                        )}
                      >
                        Ask for price
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}
        </section>
      </div>

      {supplier ? <SoldBy supplier={supplier} serviceMode={serviceMode} lead={lead} /> : null}
    </div>
  )
}

function SoldBy({
  supplier,
  serviceMode,
  lead,
}: {
  supplier: DetailSupplier
  serviceMode: boolean
  /** The About lead: some sellers reuse one line as both tagline and short description. */
  lead: string
}) {
  const tagline = supplier.tagline?.trim()
  const showTagline = Boolean(tagline) && tagline!.toLowerCase() !== lead.toLowerCase()
  const areas = (supplier.serviceAreas ?? []).filter(Boolean)
  const hiddenAreas = Math.max(0, areas.length - MAX_AREA_CHIPS)

  const facts: { key: string; icon: typeof Truck; text: string }[] = []
  if (supplier.yearsInBusiness && supplier.yearsInBusiness > 0) {
    facts.push({ key: "years", icon: TrendingUp, text: `${plural(supplier.yearsInBusiness, "year")} in business` })
  }
  if (supplier.responseTimeHours && supplier.responseTimeHours > 0) {
    facts.push({
      key: "reply",
      icon: Clock3,
      text: `Replies in about ${plural(supplier.responseTimeHours, "hour")}`,
    })
  }
  if (supplier.deliveryDays && supplier.deliveryDays > 0) {
    facts.push({
      key: "delivery",
      icon: Truck,
      text: `${serviceMode ? "Visits" : "Delivers"} in about ${plural(supplier.deliveryDays, "day")}`,
    })
  }

  return (
    <section aria-labelledby="pd-seller" className={section}>
      <h2 id="pd-seller" className={h2}>
        {serviceMode ? "Provided by" : "Sold by"}
      </h2>

      {/* One flat panel; the facts inside it are rows, not more cards. */}
      <div className="mt-3 rounded-2xl border border-ink-200 p-4">
        <div className="flex items-center gap-3">
          <span className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-ink-200 bg-brand-50 font-heading text-base font-semibold text-brand-700">
            {supplier.logo ? (
              <MediaImage
                src={supplier.logo}
                alt=""
                fill
                sizes="56px"
                className="bg-white object-contain p-1"
                fallback={supplierInitials(supplier.name)}
              />
            ) : (
              supplierInitials(supplier.name)
            )}
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-base font-bold text-ink-900">
              <span className="truncate">{supplier.name}</span>
            </p>
            {supplier.isVerified ? (
              <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-brand-700">
                <ShieldCheck aria-hidden="true" className="size-3.5" />
                Verified
              </p>
            ) : null}
            {supplier.location ? (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-500">
                <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
                <span className="truncate">{supplier.location}</span>
              </p>
            ) : null}
          </div>
        </div>

        {showTagline ? (
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-ink-600">{tagline}</p>
        ) : null}

        {facts.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {facts.map((fact) => (
              <li key={fact.key} className="flex items-center gap-2 text-sm text-ink-700">
                <fact.icon aria-hidden="true" className="size-4 shrink-0 text-brand-600" />
                {fact.text}
              </li>
            ))}
          </ul>
        ) : null}

        {areas.length > 0 ? (
          <div className="mt-4">
            <p className="text-xs font-semibold text-ink-500">{serviceMode ? "Works in" : "Delivers to"}</p>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {areas.slice(0, MAX_AREA_CHIPS).map((area) => (
                <li key={area} className="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-700">
                  {area}
                </li>
              ))}
              {hiddenAreas > 0 ? (
                <li className="rounded-full px-1.5 py-1 text-xs font-medium text-ink-500">+{hiddenAreas} more</li>
              ) : null}
            </ul>
          </div>
        ) : null}

        <Link
          href={ROUTES.MARKETPLACE_SUPPLIER(supplier.slug)}
          className={cn(
            "mt-4 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-ink-300 bg-white px-4 text-sm font-semibold text-ink-900 sm:w-auto [@media(hover:hover)_and_(pointer:fine)]:hover:bg-ink-50",
            pressable,
          )}
        >
          <Store aria-hidden="true" className="size-4" />
          {serviceMode ? "Visit provider" : "Visit seller"}
        </Link>
      </div>
    </section>
  )
}

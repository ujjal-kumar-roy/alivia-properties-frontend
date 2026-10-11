import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  Boxes,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Layers,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Store,
  TrendingUp,
  Truck,
} from "lucide-react"

import { CardFact } from "@/components/common/card-fact"
import { MobileActionBar } from "@/components/common/mobile-action-bar"
import { Disclosure } from "@/components/marketplace/Disclosure"
import { GoldStar } from "@/components/marketplace/card-icons"
import { MarketplaceBreadcrumb, type Crumb } from "@/components/marketplace/MarketplaceBreadcrumb"
import { ProductGallery } from "@/components/marketplace/product-gallery"
import { telHref, visibleRating, whatsappHref } from "@/components/marketplace/product-meta"
import { supplierInitials } from "@/components/marketplace/supplier-media-utils"
import { ROUTES } from "@/config/routes.config"
import { ApiError } from "@/services/http-client"
import { marketplaceService, type ProductWithSupplier } from "@/services/marketplace.service"
import type { ProductVariant, Supplier } from "@/types/marketplace.types"
import { formatPrice } from "@/utils/format-price"
import { isServiceKind } from "@/utils/marketplace-kind"

export const dynamic = "force-dynamic"

type PageProps = {
  params: Promise<{ slug: string }>
}

/**
 * The product detail endpoint returns the whole supplier, but the shared
 * `ProductWithSupplier` type only declares a handful of its fields.
 */
type DetailSupplier = NonNullable<ProductWithSupplier["supplier"]> &
  Partial<
    Pick<
      Supplier,
      | "tagline"
      | "location"
      | "isVerified"
      | "whatsApp"
      | "yearsInBusiness"
      | "responseTimeHours"
      | "deliveryDays"
      | "serviceAreas"
    >
  >

function variantMeta(variant: ProductVariant) {
  return (variant.specs ?? [])
    // A service package tagged "SERVICE" says nothing the page does not already say.
    .filter((spec) => !(spec.key === "materialType" && spec.value.toUpperCase() === "SERVICE"))
    .map((spec) => `${spec.value}${spec.unit ? ` ${spec.unit}` : ""}`)
    .filter(Boolean)
    .join(" / ")
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  try {
    const product = await marketplaceService.productBySlug(slug)
    return {
      title: `${product.name} - Alivia Marketplace`,
      description: product.shortDescription || product.description,
    }
  } catch {
    return { title: "Product - Alivia Marketplace" }
  }
}

export default async function MarketplaceProductPage({ params }: PageProps) {
  const { slug } = await params

  let product
  try {
    product = await marketplaceService.productBySlug(slug)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound()
    throw err
  }

  const supplier = product.supplier as DetailSupplier | undefined
  const quoteHref = `${ROUTES.MARKETPLACE_QUOTE}?productId=${product.id}&productSlug=${product.slug}${supplier ? `&supplierSlug=${supplier.slug}` : ""}`
  const serviceMode = isServiceKind(supplier?.kind)
  const supplierHref = supplier ? ROUTES.MARKETPLACE_SUPPLIER(supplier.slug) : null
  const call = telHref(supplier?.phone)
  const whatsapp = whatsappHref(supplier?.whatsApp)
  const rating = visibleRating(product.rating)
  const variants = (product.variants ?? []).filter((variant) => variant.isActive !== false)

  const breadcrumbTrail: Crumb[] = [
    ...(supplier ? [{ label: supplier.name, href: ROUTES.MARKETPLACE_SUPPLIER(supplier.slug) }] : []),
    { label: product.name },
  ]

  const hasDetails = Boolean(
    product.sku ||
      product.origin ||
      product.packaging ||
      product.warranty ||
      (product.certifications && product.certifications.length > 0),
  )
  const hasSpecs = Boolean(product.specs && product.specs.length > 0) || hasDetails
  const hasSupplierInfo = Boolean(
    supplier &&
      (supplier.tagline ||
        supplier.yearsInBusiness ||
        supplier.responseTimeHours ||
        supplier.deliveryDays ||
        (supplier.serviceAreas && supplier.serviceAreas.length > 0) ||
        call ||
        whatsapp ||
        supplier.email),
  )

  return (
    <main id="main-content" className="bg-white">
      <MarketplaceBreadcrumb trail={breadcrumbTrail} />

      <section className="container-page pb-6 pt-3 sm:py-10 lg:py-12">
        <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr] lg:gap-10">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="overflow-hidden rounded-2xl border border-border/70 bg-white shadow-(--shadow-card)">
              <ProductGallery
                name={product.name}
                image={product.image}
                gallery={product.gallery ?? []}
                videoUrl={product.videoUrl}
                externalVideoUrl={product.externalVideoUrl}
                serviceMode={serviceMode}
              />
            </div>
          </div>

          <div className="min-w-0">
            {product.category?.name && (
              <p className="text-eyebrow mb-2 hidden sm:block">{product.category.name}</p>
            )}
            <h1 className="text-balance font-heading text-xl font-semibold leading-tight text-ink-900 sm:text-3xl lg:text-4xl">
              {product.name}
            </h1>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              {rating ? (
                <CardFact icon={GoldStar} className="text-[0.8125rem]">
                  <span className="font-bold text-ink-800">{rating.toFixed(1)}</span>
                  {product.reviewCount ? (
                    <span className="font-normal text-ink-500">({product.reviewCount} reviews)</span>
                  ) : null}
                </CardFact>
              ) : null}
              {product.category?.name ? (
                <span className="text-[0.8125rem] text-ink-500 sm:hidden">{product.category.name}</span>
              ) : null}
            </div>

            {/* Price: the real figure, or "Quote on request" (the catalogue stores 0). */}
            <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <p className="font-extrabold tabular-nums text-gold-700">
                {product.price > 0 ? (
                  <>
                    <span className="text-2xl">{formatPrice(product.price, true)}</span>
                    <span className="ml-1 text-sm font-semibold text-ink-500">/ {product.unit}</span>
                  </>
                ) : (
                  <span className="text-xl">Quote on request</span>
                )}
              </p>
              <p className="text-xs text-ink-500">
                {serviceMode
                  ? "Final rate confirmed after scope, area and schedule"
                  : "Quoted after quantity and delivery location"}
              </p>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {product.inStock ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700">
                  <CheckCircle2 aria-hidden="true" className="size-3" />
                  {serviceMode ? "Available now" : "In stock"}
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                  {serviceMode ? "Schedule needed" : "On order"}
                </span>
              )}
              {product.badge ? (
                <span className="inline-flex rounded-full bg-gold-400 px-2.5 py-1 text-[0.6875rem] font-bold uppercase tracking-wide text-brand-950">
                  {product.badge}
                </span>
              ) : null}
              <span className="inline-flex rounded-full bg-brand-50 px-2.5 py-1 text-[0.6875rem] font-bold uppercase tracking-wide text-brand-700">
                {serviceMode ? "Service package" : "Catalogue product"}
              </span>
            </div>

            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
              {product.moq !== undefined && product.moq !== null && product.moq > 0 && (
                <li>
                  <CardFact icon={Boxes} className="text-[0.8125rem]">
                    {serviceMode ? "Min booking" : "MOQ"} {product.moq} {product.unit}
                  </CardFact>
                </li>
              )}
              {product.leadTimeDays !== undefined && product.leadTimeDays !== null && product.leadTimeDays > 0 && (
                <li>
                  <CardFact icon={Truck} className="text-[0.8125rem]">
                    {product.leadTimeDays} days {serviceMode ? "visit lead" : "lead time"}
                  </CardFact>
                </li>
              )}
              {product.brand && (
                <li>
                  <CardFact icon={Layers} className="text-[0.8125rem]">
                    {serviceMode ? "Team" : "Brand"}: {product.brand}
                  </CardFact>
                </li>
              )}
            </ul>

            {supplier && supplierHref ? (
              <Link
                href={supplierHref}
                className="mt-3 flex items-center gap-3 rounded-2xl border border-border/70 bg-white p-2.5 shadow-(--shadow-card) transition-[translate,scale,box-shadow] duration-200 active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100 sm:hover:shadow-(--shadow-elevated)"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 font-heading text-sm font-semibold text-brand-700">
                  {supplierInitials(supplier.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-ink-500">
                    {serviceMode ? "Provided by" : "Sold by"}
                  </span>
                  <span className="flex items-center gap-1 text-[0.9375rem] font-bold text-ink-900">
                    <span className="truncate">{supplier.name}</span>
                    {supplier.isVerified ? (
                      <ShieldCheck aria-label="Verified" className="size-4 shrink-0 text-brand-600" />
                    ) : null}
                  </span>
                  {supplier.location ? (
                    <span className="flex items-center gap-1 text-xs text-ink-500">
                      <MapPin aria-hidden="true" className="size-3 shrink-0" />
                      <span className="truncate">{supplier.location}</span>
                    </span>
                  ) : null}
                </span>
                <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-ink-400" />
              </Link>
            ) : null}

            {/* Wide screens: the actions sit under the facts. Phones use the bottom bar. */}
            <div className="mt-4 hidden flex-wrap gap-2 md:flex">
              <Link href={quoteHref} className="btn-tactile">
                <FileText aria-hidden="true" className="size-4" />
                {serviceMode ? "Get a service quote" : "Get a product quote"}
              </Link>
              {call ? (
                <a href={call} className="btn-glass">
                  <Phone aria-hidden="true" className="size-4" /> Call
                </a>
              ) : null}
              {whatsapp ? (
                <a href={whatsapp} target="_blank" rel="noreferrer" className="btn-glass">
                  <MessageCircle aria-hidden="true" className="size-4" /> WhatsApp
                </a>
              ) : null}
            </div>

            <div className="mt-4 grid gap-2.5 sm:mt-6">
              <Disclosure title={serviceMode ? "About this service" : "About this product"} defaultOpen>
                <p className="whitespace-pre-line text-[0.9375rem] leading-relaxed text-ink-700 sm:text-base">
                  {product.shortDescription ? (
                    <>
                      <span className="font-semibold text-ink-900">{product.shortDescription}</span>
                      {"\n"}
                    </>
                  ) : null}
                  {product.description}
                </p>
                {product.highlights && product.highlights.length > 0 && (
                  <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                    {product.highlights.map((highlight, index) => (
                      <li key={index} className="flex items-start gap-2 text-[0.9375rem] text-ink-700 sm:text-base">
                        <CheckCircle2 aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-brand-600" />
                        {highlight}
                      </li>
                    ))}
                  </ul>
                )}
              </Disclosure>

              {variants.length > 0 && (
                <Disclosure
                  title={serviceMode ? "Packages" : "Options"}
                  meta={`${variants.length}`}
                  defaultOpen={variants.length <= 4}
                >
                  <ul className="grid gap-2">
                    {variants.map((variant) => (
                      <li
                        key={variant.id}
                        className="flex items-center justify-between gap-3 rounded-xl bg-ink-50/70 p-2.5 pl-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink-900">{variant.name}</p>
                          {variantMeta(variant) ? (
                            <p className="mt-0.5 text-xs text-ink-500">{variantMeta(variant)}</p>
                          ) : null}
                        </div>
                        <Link
                          href={`${quoteHref}&variantId=${variant.id}`}
                          aria-label={`${serviceMode ? "Quote package" : "Quote option"} ${variant.name}`}
                          className="btn-glass min-h-9 shrink-0 px-3.5 text-[0.8125rem]"
                        >
                          Quote
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Disclosure>
              )}

              {hasSpecs && (
                <Disclosure title="Specifications">
                  {product.specs && product.specs.length > 0 && (
                    <dl className="grid gap-2 sm:grid-cols-2">
                      {product.specs.map((spec) => (
                        <div key={spec.key} className="rounded-xl bg-ink-50/70 px-3 py-2">
                          <dt className="text-[0.6875rem] uppercase tracking-wider text-ink-500">{spec.label}</dt>
                          <dd className="mt-0.5 text-sm font-medium text-ink-900">
                            {spec.value}
                            {spec.unit ? ` ${spec.unit}` : ""}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  {hasDetails && (
                    <>
                      <dl className={`grid gap-2 sm:grid-cols-2 ${product.specs && product.specs.length > 0 ? "mt-3" : ""}`}>
                        {product.sku && <DetailItem label="SKU" value={product.sku} />}
                        {product.origin && <DetailItem label="Origin" value={product.origin} />}
                        {product.packaging && <DetailItem label="Packaging" value={product.packaging} />}
                        {product.warranty && <DetailItem label="Warranty" value={product.warranty} />}
                      </dl>
                      {product.certifications && product.certifications.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {product.certifications.map((cert) => (
                            <span
                              key={cert}
                              className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700"
                            >
                              {cert}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </Disclosure>
              )}

              {product.priceTiers && product.priceTiers.length > 0 && (
                <Disclosure title="Bulk pricing" meta={`${product.priceTiers.length} tiers`}>
                  <ul className="divide-y divide-border/60 text-sm">
                    {product.priceTiers.map((tier, index) => (
                      <li key={index} className="flex items-baseline justify-between gap-3 py-2 first:pt-0 last:pb-0">
                        <span className="text-ink-700">
                          {tier.minQty}
                          {tier.maxQty ? `-${tier.maxQty}` : "+"} {product.unit}
                          {tier.note ? <span className="block text-xs text-ink-500">{tier.note}</span> : null}
                        </span>
                        <span className="shrink-0 font-bold tabular-nums text-gold-700">
                          {formatPrice(tier.price, true)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Disclosure>
              )}

              {product.documents && product.documents.length > 0 && (
                <Disclosure title="Documents" meta={`${product.documents.length}`}>
                  <div className="flex flex-col gap-2">
                    {product.documents.map((doc, index) => (
                      <a
                        key={index}
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex min-h-11 items-center gap-2 rounded-xl border border-border/60 px-3 text-sm font-medium text-brand-700 hover:bg-brand-50"
                      >
                        <FileText aria-hidden="true" className="size-4 shrink-0" /> {doc.label}
                      </a>
                    ))}
                  </div>
                </Disclosure>
              )}

              {supplier && hasSupplierInfo && (
                <Disclosure title={serviceMode ? "About the provider" : "About the supplier"}>
                  {supplier.tagline ? (
                    <p className="text-[0.9375rem] leading-relaxed text-ink-700">{supplier.tagline}</p>
                  ) : null}
                  <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
                    {supplier.yearsInBusiness ? (
                      <li>
                        <CardFact icon={TrendingUp} className="text-[0.8125rem]">
                          {supplier.yearsInBusiness} years in business
                        </CardFact>
                      </li>
                    ) : null}
                    {supplier.responseTimeHours ? (
                      <li>
                        <CardFact icon={Clock3} className="text-[0.8125rem]">
                          Replies in about {supplier.responseTimeHours}h
                        </CardFact>
                      </li>
                    ) : null}
                    {supplier.deliveryDays ? (
                      <li>
                        <CardFact icon={Truck} className="text-[0.8125rem]">
                          {supplier.deliveryDays}d {serviceMode ? "visit lead" : "delivery"}
                        </CardFact>
                      </li>
                    ) : null}
                  </ul>
                  {supplier.serviceAreas && supplier.serviceAreas.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {supplier.serviceAreas.map((area) => (
                        <span
                          key={area}
                          className="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-700"
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {supplierHref ? (
                      <Link href={supplierHref} className="btn-glass">
                        <Store aria-hidden="true" className="size-4" />
                        View {serviceMode ? "provider" : "supplier"}
                      </Link>
                    ) : null}
                    {supplier.email ? (
                      <a href={`mailto:${supplier.email}`} className="btn-glass">
                        <Mail aria-hidden="true" className="size-4" /> Email
                      </a>
                    ) : null}
                  </div>
                </Disclosure>
              )}
            </div>
          </div>
        </div>
      </section>

      <MobileActionBar label={serviceMode ? "Book this service" : "Quote this product"}>
        <Link href={quoteHref} className="btn-tactile flex-1">
          <FileText aria-hidden="true" className="size-4" />
          Get a quote
        </Link>
        {call ? (
          <a
            href={call}
            aria-label={`Call ${supplier?.name ?? "the seller"}`}
            className="btn-glass size-11 shrink-0 !p-0"
          >
            <Phone aria-hidden="true" className="size-4" />
          </a>
        ) : null}
        {whatsapp ? (
          <a
            href={whatsapp}
            target="_blank"
            rel="noreferrer"
            aria-label={`WhatsApp ${supplier?.name ?? "the seller"}`}
            className="btn-glass size-11 shrink-0 !p-0"
          >
            <MessageCircle aria-hidden="true" className="size-4" />
          </a>
        ) : null}
      </MobileActionBar>
    </main>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-ink-50/70 px-3 py-2">
      <dt className="text-[0.6875rem] uppercase tracking-wider text-ink-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-ink-900">{value}</dd>
    </div>
  )
}

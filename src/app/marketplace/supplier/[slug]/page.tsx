import {
  CheckCircle2,
  Clock3,
  FileText,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShoppingBag,
  Star,
  TrendingUp,
  Truck,
} from "lucide-react";

import { MarketplaceBreadcrumb, type Crumb } from "@/components/marketplace/MarketplaceBreadcrumb";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import {
  buildSupplierMedia,
  formatCompactBd,
} from "@/components/marketplace/supplier-media-utils";
import { SupplierMediaShowcase } from "@/components/marketplace/SupplierMediaShowcase";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/routes.config";
import { ApiError } from "@/services/http-client";
import { marketplaceService } from "@/services/marketplace.service";
import type {
  MarketplaceProduct,
  ProductVariant,
} from "@/types/marketplace.types";
import { formatPrice } from "@/utils/format-price";
import { isServiceKind } from "@/utils/marketplace-kind";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

function variantMeta(variant: ProductVariant) {
  return (variant.specs ?? [])
    .map((spec) => `${spec.value}${spec.unit ? ` ${spec.unit}` : ""}`)
    .filter(Boolean)
    .join(" / ");
}

function productStartingPrice(product: MarketplaceProduct) {
  const prices = [
    product.price,
    ...(product.variants ?? []).map((variant) => variant.price ?? 0),
  ].filter((value) => typeof value === "number" && value > 0) as number[];

  return prices.length > 0 ? Math.min(...prices) : null;
}

function productVariantLabels(product: MarketplaceProduct) {
  return (product.variants ?? [])
    .filter((variant) => variant.isActive !== false)
    .slice(0, 4);
}

function productSpecHighlights(product: MarketplaceProduct) {
  return Array.from(
    new Set(
      (product.variants ?? [])
        .filter((variant) => variant.isActive !== false)
        .map(variantMeta)
        .filter(Boolean),
    ),
  ).slice(0, 2);
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const supplier = await marketplaceService.supplierBySlug(slug);
    return {
      title: `${supplier.name} — Alivia Marketplace`,
      description: supplier.tagline ?? "Verified supplier profile",
    };
  } catch {
    return { title: "Supplier — Alivia Marketplace" };
  }
}

export default async function SupplierProfilePage({ params }: PageProps) {
  const { slug } = await params;

  let supplier;
  try {
    supplier = await marketplaceService.supplierBySlug(slug);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const products = supplier.products ?? [];
  const readyProducts = products.filter((product) => product.inStock).length;
  const onOrderProducts = Math.max(0, products.length - readyProducts);
  const quoteHref = `${ROUTES.MARKETPLACE_QUOTE}?supplierSlug=${supplier.slug}`;
  const mediaCount = buildSupplierMedia(supplier).length;
  const variantCount = products.reduce(
    (sum, product) => sum + (product.variants?.length ?? 0),
    0,
  );
  const serviceMode = isServiceKind(supplier.kind);
  const soldCountLabel =
    typeof supplier.itemsSold === "number" && supplier.itemsSold > 0
      ? formatCompactBd(supplier.itemsSold)
      : "New";

  const breadcrumbTrail: Crumb[] = [{ label: supplier.name }];

  return (
    <main className="bg-white">

      <section className="relative overflow-hidden border-b border-border/60 bg-ink-950 text-white">
        {supplier.coverImage && (
          <div className="absolute inset-0">
            <Image
              src={supplier.coverImage}
              alt=""
              fill
              unoptimized
              sizes="100vw"
              priority
              className="object-cover opacity-20"
            />
          </div>
        )}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(246,190,63,0.18),transparent_30%),linear-gradient(135deg,rgba(6,41,31,0.97),rgba(4,22,17,0.92))]" />

        <div className="container-page relative py-10 sm:py-14 lg:py-16">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-50 backdrop-blur-sm">
                  {serviceMode ? "Bangladesh Service Provider" : "Bangladesh Supplier"}
                </span>
                {supplier.isVerified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-500/25 px-3 py-1 text-[11px] font-semibold text-brand-50 backdrop-blur-sm">
                    <CheckCircle2 aria-hidden="true" className="size-3.5" />{" "}
                    Verified
                  </span>
                )}
                {supplier.isFeatured && (
                  <span className="rounded-full bg-gold-400/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-200 backdrop-blur-sm">
                    Featured Pick
                  </span>
                )}
              </div>

              <h1 className="mt-4 max-w-3xl text-balance font-heading text-4xl font-semibold sm:text-5xl">
                {supplier.name}
              </h1>
              {supplier.tagline && (
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-brand-50/86 sm:text-base">
                  {supplier.tagline}
                </p>
              )}

              <div className="mt-6 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <div className="rounded-[1.75rem] border border-red-300/25 bg-red-500/10 px-5 py-4 backdrop-blur-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-red-200">
                    Bangladesh Market Price
                  </p>
                  <p className="mt-2 text-2xl font-bold text-red-100">
                    {supplier.priceRange ?? "Price on request"}
                  </p>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm backdrop-blur-sm">
                  <Star
                    aria-hidden="true"
                    className="size-4 fill-gold-400 text-gold-400"
                  />
                  <span className="font-semibold">
                    {supplier.rating.toFixed(1)}
                  </span>
                  <span className="text-brand-100/80">
                    ({supplier.reviewCount} reviews)
                  </span>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <HeroStat
                  label={serviceMode ? "Jobs Done" : "Items Sold"}
                  value={soldCountLabel}
                  note={serviceMode ? "recent booking signal" : "recent buying signal"}
                />
                <HeroStat
                  label="Reply Time"
                  value={
                    supplier.responseTimeHours
                      ? `${supplier.responseTimeHours}h`
                      : "Fast"
                  }
                  note="typical desk response"
                />
                <HeroStat
                  label={serviceMode ? "Visit Lead" : "Delivery"}
                  value={
                    supplier.deliveryDays
                      ? `${supplier.deliveryDays}d`
                      : "Quick"
                  }
                  note={serviceMode ? "usual booking window" : "usual lead window"}
                />
                <HeroStat
                  label="Coverage"
                  value={
                    supplier.serviceAreas?.length
                      ? `${supplier.serviceAreas.length} areas`
                      : supplier.location
                  }
                  note="Bangladesh service footprint"
                />
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <Link href={quoteHref}>
                  <Button
                    size="lg"
                    className="gap-2 bg-gold-400 text-ink-900 hover:bg-gold-300"
                  >
                    <FileText aria-hidden="true" className="size-4" />
                    {serviceMode ? "Request Service Quote" : "Request a Quote"}
                  </Button>
                </Link>
                <a href={`tel:${supplier.phone}`}>
                  <Button
                    size="lg"
                    variant="outline"
                    className="gap-2 border-white/20 bg-white/10 text-white hover:bg-white/18"
                  >
                    <Phone aria-hidden="true" className="size-4" />
                    Call Now
                  </Button>
                </a>
                {supplier.whatsApp && (
                  <a
                    href={`https://wa.me/${supplier.whatsApp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button
                      size="lg"
                      variant="outline"
                      className="gap-2 border-emerald-300/35 bg-emerald-500/10 text-emerald-50 hover:bg-emerald-500/18"
                    >
                      <MessageCircle aria-hidden="true" className="size-4" />
                      WhatsApp
                    </Button>
                  </a>
                )}
              </div>

              <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm text-brand-50/80">
                <span className="inline-flex items-center gap-1.5">
                  <TrendingUp
                    aria-hidden="true"
                    className="size-4 text-gold-300"
                  />
                  {supplier.yearsInBusiness} years in business
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin aria-hidden="true" className="size-4 text-gold-300" />
                  {supplier.location}
                </span>
                {mediaCount > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <ShoppingBag
                      aria-hidden="true"
                      className="size-4 text-gold-300"
                    />
                    {mediaCount} media assets
                  </span>
                )}
              </div>
            </div>

            <SupplierMediaShowcase supplier={supplier} className="lg:mt-2" />
          </div>
        </div>
      </section>

      <MarketplaceBreadcrumb trail={breadcrumbTrail} />

      <section className="container-page py-10 sm:py-14">
        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <InfoCard
            label={serviceMode ? "Available Packages" : "Ready Products"}
            value={String(readyProducts)}
            note={serviceMode ? "service lines buyers can request now" : "in-stock lines buyers can request now"}
          />
          <InfoCard
            label={serviceMode ? "Schedule Needed" : "On Order"}
            value={String(onOrderProducts)}
            note={serviceMode ? "packages that need booking or confirmation" : "special-order or limited-stock lines"}
          />
          <InfoCard
            label={serviceMode ? "Package Options" : "Size Options"}
            value={String(variantCount)}
            note={serviceMode ? "packages, visit types, and service specs" : "variants, dimensions, finishes, and specs"}
          />
          <InfoCard
            label="Showroom Media"
            value={String(mediaCount)}
            note="photos and video used to build buyer trust"
          />
        </div>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div>
            <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-eyebrow mb-1">{serviceMode ? "Service packages" : "Products & services"}</p>
                <h2 className="text-balance font-heading text-2xl font-semibold text-ink-900 sm:text-3xl">
                  {products.length > 0
                    ? `${products.length} offerings ready to compare`
                    : "Catalogue coming soon"}
                </h2>
                {products.length > 0 && (
                  <p className="mt-1 max-w-2xl text-sm text-ink-600">
                    {serviceMode
                      ? "Compare package price, booking lead, option details, and coverage before you request pricing."
                      : "Compare price, size options, stock, MOQ, and delivery time before you request pricing."}
                  </p>
                )}
              </div>
              <Link href={quoteHref}>
                <Button size="sm" className="gap-1.5">
                  <FileText aria-hidden="true" className="size-3.5" /> {serviceMode ? "Request service quote" : "Request a quote"}
                </Button>
              </Link>
            </header>

            {products.length > 0 ? (
              <ul className="grid gap-6 xl:grid-cols-2">
                {products.map((product) => {
                  const startingPrice = productStartingPrice(product);
                  const variants = productVariantLabels(product);
                  const specs = productSpecHighlights(product);

                  return (
                    <li
                      key={product.id}
                      className="overflow-hidden rounded-[2rem] border border-border/70 bg-white shadow-(--shadow-card)"
                    >
                      <div className="relative aspect-16/10 overflow-hidden bg-ink-50">
                        {product.image ? (
                          <Image
                            src={product.image}
                            alt={product.name}
                            fill
                            unoptimized
                            sizes="(min-width: 1280px) 32vw, (min-width: 768px) 50vw, 100vw"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center bg-linear-to-br from-ink-100 to-brand-50 text-sm font-medium text-ink-500">
                            {serviceMode ? "Service image coming soon" : "Product image coming soon"}
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/60 via-black/8 to-transparent p-4">
                          <div className="flex flex-wrap gap-2">
                            <span
                              className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                                product.inStock
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-red-50 text-red-700"
                              }`}
                            >
                              {product.inStock ? (serviceMode ? "Available Now" : "In Stock") : serviceMode ? "Schedule Needed" : "On Order"}
                            </span>
                            {product.moq ? (
                              <span className="rounded-full bg-black/55 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                                {serviceMode ? "Min booking" : "MOQ"} {product.moq} {product.unit}
                              </span>
                            ) : null}
                            {product.leadTimeDays ? (
                              <span className="rounded-full bg-black/55 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                                {product.leadTimeDays}d {serviceMode ? "visit lead" : "lead"}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="p-5 sm:p-6">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <Link
                              href={ROUTES.MARKETPLACE_PRODUCT(product.slug)}
                              className="font-heading text-xl font-semibold text-ink-900 transition-colors hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                            >
                              {product.name}
                            </Link>
                            {product.brand && (
                              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">
                                {product.brand}
                              </p>
                            )}
                          </div>

                          <div className="rounded-2xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-right">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-red-600">
                              {serviceMode ? "Starting Rate" : "Indicative Price"}
                            </p>
                            <p className="mt-1 text-base font-bold text-red-700">
                              {startingPrice
                                ? formatPrice(startingPrice, true)
                                : "Quote"}
                              <span className="ml-1 text-xs font-medium text-red-500">
                                / {product.unit}
                              </span>
                            </p>
                          </div>
                        </div>

                        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-600">
                          {product.shortDescription || product.description}
                        </p>

                        {variants.length > 0 && (
                          <div className="mt-4">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-500">
                              {serviceMode ? "Packages & popular options" : "Sizes & popular options"}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {variants.map((variant) => (
                                <span
                                  key={variant.id}
                                  title={variantMeta(variant)}
                                  className="rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700"
                                >
                                  {variant.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {specs.length > 0 && (
                          <div className="mt-4 space-y-1.5 rounded-2xl bg-ink-50/80 p-3">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-500">
                              {serviceMode ? "Service snapshot" : "Buyer-friendly spec snapshot"}
                            </p>
                            {specs.map((spec) => (
                              <p key={spec} className="text-sm text-ink-700">
                                {spec}
                              </p>
                            ))}
                          </div>
                        )}

                        <div className="mt-5 flex flex-wrap gap-2">
                          <Link href={ROUTES.MARKETPLACE_PRODUCT(product.slug)}>
                            <Button size="sm" variant="outline">
                              {serviceMode ? "View Service" : "View Product"}
                            </Button>
                          </Link>
                          <Link
                            href={`${ROUTES.MARKETPLACE_QUOTE}?productId=${product.id}&productSlug=${product.slug}&supplierSlug=${supplier.slug}`}
                          >
                            <Button size="sm" className="gap-1.5">
                              <FileText
                                aria-hidden="true"
                                className="size-3.5"
                              />
                              {serviceMode ? "Quote This Service" : "Quote This Item"}
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="rounded-[2rem] border border-border/70 bg-white p-8 text-center shadow-(--shadow-card)">
                <p className="font-heading text-lg font-semibold text-ink-900">
                  {serviceMode ? "No service packages yet" : "No listings yet"}
                </p>
                <p className="mt-2 text-sm text-ink-600">
                  {serviceMode
                    ? "Send one request and the provider desk will share matching packages, booking slots, and pricing."
                    : "Send one request and the supplier desk will share matching sizes, prices, and availability."}
                </p>
                <div className="mt-5">
                  <Link href={quoteHref}>
                    <Button size="sm" className="gap-1.5">
                      <FileText aria-hidden="true" className="size-3.5" />{" "}
                      {serviceMode ? "Request service quote" : "Request a quote"}
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
            <div className="rounded-[2rem] border border-border/70 bg-white p-5 shadow-(--shadow-card)">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-700">
                Contact This {serviceMode ? "Provider" : "Supplier"}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                {supplier.priceRange ?? "Price on request"} · typically replies
                in about {supplier.responseTimeHours ?? 24}h.
              </p>

              <div className="mt-4 space-y-2">
                <Link href={quoteHref} className="block">
                  <Button size="sm" className="w-full gap-1.5">
                    <FileText aria-hidden="true" className="size-3.5" />{" "}
                    {serviceMode ? "Get a Service Quote" : "Get a Quote"}
                  </Button>
                </Link>
                <a href={`tel:${supplier.phone}`} className="block">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-1.5"
                  >
                    <Phone aria-hidden="true" className="size-3.5" /> Call Now
                  </Button>
                </a>
                {supplier.whatsApp && (
                  <a
                    href={`https://wa.me/${supplier.whatsApp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="block"
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full gap-1.5 border-emerald-500/30 text-emerald-700 hover:bg-emerald-50"
                    >
                      <MessageCircle aria-hidden="true" className="size-3.5" />{" "}
                      WhatsApp
                    </Button>
                  </a>
                )}
                {supplier.email && (
                  <a href={`mailto:${supplier.email}`} className="block">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full gap-1.5"
                    >
                      <Mail aria-hidden="true" className="size-3.5" /> Email
                    </Button>
                  </a>
                )}
              </div>
            </div>

            <div className="rounded-[2rem] border border-border/70 bg-white p-5 shadow-(--shadow-card)">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-700">
                {serviceMode ? "Provider Snapshot" : "Supplier Snapshot"}
              </p>
              <div className="mt-3 space-y-3 text-sm text-ink-700">
                <SidebarFact
                  icon={
                    <TrendingUp
                      aria-hidden="true"
                      className="size-4 text-brand-600"
                    />
                  }
                  label="Years in business"
                  value={`${supplier.yearsInBusiness}`}
                />
                <SidebarFact
                  icon={
                    <Clock3
                      aria-hidden="true"
                      className="size-4 text-brand-600"
                    />
                  }
                  label="Average reply"
                  value={
                    supplier.responseTimeHours
                      ? `${supplier.responseTimeHours}h`
                      : "Fast"
                  }
                />
                <SidebarFact
                  icon={
                    <Truck
                      aria-hidden="true"
                      className="size-4 text-brand-600"
                    />
                  }
                  label={serviceMode ? "Visit lead" : "Delivery lead"}
                  value={
                    supplier.deliveryDays
                      ? `${supplier.deliveryDays}d`
                      : "Quick"
                  }
                />
                <SidebarFact
                  icon={
                    <MapPin
                      aria-hidden="true"
                      className="size-4 text-brand-600"
                    />
                  }
                  label="Base location"
                  value={supplier.location}
                />
                <SidebarFact
                  icon={
                    <ShoppingBag
                      aria-hidden="true"
                      className="size-4 text-brand-600"
                    />
                  }
                  label={serviceMode ? "Jobs done" : "Items sold"}
                  value={soldCountLabel}
                />
              </div>
            </div>

            {supplier.serviceAreas?.length > 0 && (
              <div className="rounded-[2rem] border border-border/70 bg-white p-5 shadow-(--shadow-card)">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-700">
                  Service Areas
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {supplier.serviceAreas.map((area) => (
                    <span
                      key={area}
                      className="rounded-full bg-ink-100 px-3 py-1 text-xs font-medium text-ink-700"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {((supplier.brands?.length ?? 0) > 0 ||
              (supplier.certifications?.length ?? 0) > 0) && (
              <div className="rounded-[2rem] border border-border/70 bg-white p-5 shadow-(--shadow-card)">
                {(supplier.brands?.length ?? 0) > 0 && (
                  <>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-700">
                      Brands Carried
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {supplier.brands?.map((brand) => (
                        <span
                          key={brand}
                          className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700"
                        >
                          {brand}
                        </span>
                      ))}
                    </div>
                  </>
                )}

                {(supplier.certifications?.length ?? 0) > 0 && (
                  <>
                    <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-700">
                      Certifications
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {supplier.certifications?.map((certification) => (
                        <span
                          key={certification}
                          className="rounded-full bg-gold-100 px-3 py-1 text-xs font-semibold text-gold-800"
                        >
                          {certification}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}

function HeroStat({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/12 bg-white/8 px-4 py-3 backdrop-blur-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-100/80">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-brand-50/72">{note}</p>
    </div>
  );
}

function InfoCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-[1.75rem] border border-border/70 bg-white p-4 shadow-(--shadow-card)">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-700">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-ink-900">{value}</p>
      <p className="mt-1 text-sm text-ink-600">{note}</p>
    </div>
  );
}

function SidebarFact({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-ink-50/80 px-3.5 py-3">
      <span className="mt-0.5">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">
          {label}
        </p>
        <p className="mt-1 text-sm font-medium text-ink-900">{value}</p>
      </div>
    </div>
  );
}

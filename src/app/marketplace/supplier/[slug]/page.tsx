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
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { CountUp } from "@/components/common/count-up";
import { MobileActionBar } from "@/components/common/mobile-action-bar";
import { toCardProduct } from "@/components/marketplace/card-product";
import { Disclosure } from "@/components/marketplace/Disclosure";
import { MarketplaceProductCard } from "@/components/marketplace/MarketplaceProductCard";
import { MediaImage } from "@/components/marketplace/MediaImage";
import { telHref, whatsappHref } from "@/components/marketplace/product-meta";
import {
  buildSupplierMedia,
  formatCompactBd,
} from "@/components/marketplace/supplier-media-utils";
import { SupplierMediaShowcase } from "@/components/marketplace/SupplierMediaShowcase";
import { ROUTES } from "@/config/routes.config";
import { ApiError } from "@/services/http-client";
import { marketplaceService } from "@/services/marketplace.service";
import { isServiceKind } from "@/utils/marketplace-kind";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const supplier = await marketplaceService.supplierBySlug(slug);
    return {
      title: `${supplier.name} - Alivia Marketplace`,
      description: supplier.tagline ?? "Verified supplier profile",
    };
  } catch {
    return { title: "Supplier - Alivia Marketplace" };
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
  const call = telHref(supplier.phone);
  const whatsapp = whatsappHref(supplier.whatsApp);
  const soldCountLabel =
    typeof supplier.itemsSold === "number" && supplier.itemsSold > 0
      ? formatCompactBd(supplier.itemsSold)
      : "New";
  const hasBrands = (supplier.brands?.length ?? 0) > 0;
  const hasCerts = (supplier.certifications?.length ?? 0) > 0;

  const heroStats: { label: string; value: string }[] = [
    { label: serviceMode ? "Jobs done" : "Items sold", value: soldCountLabel },
  ];
  if (supplier.responseTimeHours) {
    heroStats.push({ label: "Reply time", value: `${supplier.responseTimeHours}h` });
  }
  if (supplier.deliveryDays) {
    heroStats.push({
      label: serviceMode ? "Visit lead" : "Delivery",
      value: `${supplier.deliveryDays}d`,
    });
  }
  if (supplier.serviceAreas?.length) {
    heroStats.push({ label: "Coverage", value: `${supplier.serviceAreas.length} areas` });
  }

  const breadcrumbTrail: Crumb[] = [{ label: supplier.name }];

  return (
    <main id="main-content" className="bg-white">
      <MarketplaceBreadcrumb trail={breadcrumbTrail} />

      <section className="relative overflow-hidden border-b border-border/60 bg-ink-950 text-white">
        {supplier.coverImage && (
          <div className="absolute inset-0">
            <MediaImage
              src={supplier.coverImage}
              alt=""
              fill
              unoptimized
              sizes="100vw"
              className="object-cover opacity-20"
              fallback={null}
            />
          </div>
        )}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(246,190,63,0.18),transparent_30%),linear-gradient(135deg,rgba(6,41,31,0.97),rgba(4,22,17,0.92))]" />

        <div className="container-page relative py-3 sm:py-10 lg:py-14">
          <div className="grid gap-3 sm:gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start lg:gap-10">
            {/* Phones show the gallery first; wide screens keep the text on the left. */}
            <SupplierMediaShowcase
              supplier={supplier}
              className="order-1 lg:order-2 lg:mt-2"
            />

            <div className="enter-cascade order-2 min-w-0 lg:order-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="hidden rounded-full bg-white/10 px-3 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-brand-50 backdrop-blur-sm sm:inline-block">
                  {serviceMode ? "Bangladesh Service Provider" : "Bangladesh Supplier"}
                </span>
                {supplier.isVerified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-500/25 px-2.5 py-1 text-xs font-semibold text-brand-50 backdrop-blur-sm">
                    <CheckCircle2 aria-hidden="true" className="size-3.5" />
                    Verified
                  </span>
                )}
                {supplier.isFeatured && (
                  <span className="rounded-full bg-gold-400/20 px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-gold-200 backdrop-blur-sm">
                    Featured
                  </span>
                )}
              </div>

              <h1 className="mt-2 max-w-3xl text-balance font-heading text-2xl font-semibold leading-tight sm:mt-4 sm:text-5xl">
                {supplier.name}
              </h1>
              {supplier.tagline && (
                <p className="mt-1.5 line-clamp-2 max-w-2xl text-[0.8125rem] leading-snug text-brand-50/86 sm:mt-3 sm:line-clamp-none sm:text-base sm:leading-relaxed">
                  {supplier.tagline}
                </p>
              )}

              <div className="mt-3 flex items-stretch gap-2 sm:mt-6 sm:gap-4">
                <div className="min-w-0 flex-1 rounded-xl border border-gold-300/25 bg-gold-400/10 px-3 py-2 backdrop-blur-sm sm:rounded-[1.75rem] sm:px-5 sm:py-4">
                  <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-gold-200">
                    {serviceMode ? "Service rate" : "Market price"}
                  </p>
                  <p className="mt-0.5 truncate text-lg font-extrabold tabular-nums text-gold-100 sm:mt-2 sm:text-2xl">
                    {supplier.priceRange ?? "Quote on request"}
                  </p>
                </div>
                {supplier.rating > 0 && (
                  <div className="flex shrink-0 flex-col items-center justify-center rounded-xl bg-white/10 px-3 py-2 backdrop-blur-sm sm:flex-row sm:gap-1.5 sm:rounded-full sm:px-4">
                    <span className="inline-flex items-center gap-1">
                      <Star
                        aria-hidden="true"
                        className="size-4 fill-gold-400 text-gold-400"
                      />
                      <span className="font-semibold tabular-nums">
                        {supplier.rating.toFixed(1)}
                      </span>
                    </span>
                    <span className="text-xs text-brand-100/80 sm:text-sm">
                      {supplier.reviewCount} reviews
                    </span>
                  </div>
                )}
              </div>

              <dl className="mt-2 grid grid-cols-4 gap-1.5 sm:mt-6 sm:gap-3 xl:grid-cols-4">
                {heroStats.map((stat) => (
                  <HeroStat key={stat.label} label={stat.label} value={stat.value} />
                ))}
              </dl>

              {/* Wide screens: actions here. Phones use the bottom bar. */}
              <div className="mt-6 hidden flex-wrap gap-2 md:flex">
                <Link href={quoteHref} className="btn-tactile btn-tactile--gold">
                  <FileText aria-hidden="true" className="size-4" />
                  {serviceMode ? "Request service quote" : "Request a quote"}
                </Link>
                {call ? (
                  <a href={call} className="btn-glass">
                    <Phone aria-hidden="true" className="size-4" />
                    Call now
                  </a>
                ) : null}
                {whatsapp ? (
                  <a href={whatsapp} target="_blank" rel="noreferrer" className="btn-glass">
                    <MessageCircle aria-hidden="true" className="size-4" />
                    WhatsApp
                  </a>
                ) : null}
              </div>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[0.8125rem] text-brand-50/80 sm:mt-6 sm:text-sm">
                {supplier.yearsInBusiness > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <TrendingUp aria-hidden="true" className="size-4 text-gold-300" />
                    {supplier.yearsInBusiness} years in business
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <MapPin aria-hidden="true" className="size-4 text-gold-300" />
                  {supplier.location}
                </span>
                {mediaCount > 0 && (
                  <span className="hidden items-center gap-1.5 sm:inline-flex">
                    <ShoppingBag aria-hidden="true" className="size-4 text-gold-300" />
                    {mediaCount} media assets
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page pb-6 pt-4 sm:py-10 lg:py-12">
        <ul className="reveal-stagger mb-5 grid grid-cols-2 gap-2.5 sm:mb-8 sm:grid-cols-4 sm:gap-4">
          <InfoCard
            label={serviceMode ? "Available packages" : "Ready products"}
            value={readyProducts}
            note={serviceMode ? "service lines buyers can request now" : "in-stock lines buyers can request now"}
          />
          <InfoCard
            label={serviceMode ? "Schedule needed" : "On order"}
            value={onOrderProducts}
            note={serviceMode ? "packages that need booking or confirmation" : "special-order or limited-stock lines"}
          />
          <InfoCard
            label={serviceMode ? "Package options" : "Size options"}
            value={variantCount}
            note={serviceMode ? "packages, visit types, and service specs" : "variants, dimensions, finishes, and specs"}
          />
          <InfoCard
            label="Showroom media"
            value={mediaCount}
            note="photos and video used to build buyer trust"
          />
        </ul>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-8">
          <div className="min-w-0">
            <header className="mb-3 flex flex-wrap items-end justify-between gap-3 sm:mb-5">
              <div>
                <p className="text-eyebrow mb-1 hidden sm:block">
                  {serviceMode ? "Service packages" : "Products & services"}
                </p>
                <h2 className="text-balance font-heading text-lg font-semibold text-ink-900 sm:text-3xl">
                  {products.length > 0
                    ? `${products.length} ${products.length === 1 ? "offering" : "offerings"} ready to compare`
                    : "Catalogue coming soon"}
                </h2>
                {products.length > 0 && (
                  <p className="mt-1 hidden max-w-2xl text-sm text-ink-600 sm:block">
                    {serviceMode
                      ? "Compare package price, booking lead, option details, and coverage before you request pricing."
                      : "Compare price, size options, stock, MOQ, and delivery time before you request pricing."}
                  </p>
                )}
              </div>
              <Link href={quoteHref} className="btn-tactile btn-tactile--sm hidden md:inline-flex">
                <FileText aria-hidden="true" className="size-3.5" />
                {serviceMode ? "Request service quote" : "Request a quote"}
              </Link>
            </header>

            {products.length > 0 ? (
              <ul className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-4">
                {products.map((product) => (
                  <li key={product.id} className="reveal min-w-0">
                    <MarketplaceProductCard
                      product={toCardProduct(product)}
                      supplierName={supplier.name}
                      serviceMode={serviceMode}
                      hideSupplier
                      className="h-full"
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-2xl border border-border/70 bg-white p-5 text-center shadow-(--shadow-card) sm:p-8">
                <p className="font-heading text-lg font-semibold text-ink-900">
                  {serviceMode ? "No service packages yet" : "No listings yet"}
                </p>
                <p className="mt-1.5 text-sm text-ink-600">
                  {serviceMode
                    ? "Send one request and the provider desk will share matching packages, booking slots, and pricing."
                    : "Send one request and the supplier desk will share matching sizes, prices, and availability."}
                </p>
                <div className="mt-4">
                  <Link href={quoteHref} className="btn-tactile btn-tactile--sm">
                    <FileText aria-hidden="true" className="size-3.5" />
                    {serviceMode ? "Request service quote" : "Request a quote"}
                  </Link>
                </div>
              </div>
            )}
          </div>

          <aside className="grid gap-2.5 xl:sticky xl:top-24 xl:self-start xl:gap-4">
            {/* Contact: its own card on wide screens (phones have the bottom bar). */}
            <div className="hidden rounded-[2rem] border border-border/70 bg-white p-5 shadow-(--shadow-card) xl:block">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-brand-700">
                Contact this {serviceMode ? "provider" : "supplier"}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                {supplier.priceRange ?? "Quote on request"}
                {supplier.responseTimeHours
                  ? `, typically replies in about ${supplier.responseTimeHours}h.`
                  : "."}
              </p>
              <div className="mt-4 grid gap-2">
                <Link href={quoteHref} className="btn-tactile btn-tactile--sm btn-tactile--block">
                  <FileText aria-hidden="true" className="size-3.5" />
                  {serviceMode ? "Get a service quote" : "Get a quote"}
                </Link>
                {call ? (
                  <a href={call} className="btn-glass">
                    <Phone aria-hidden="true" className="size-3.5" /> Call now
                  </a>
                ) : null}
                {whatsapp ? (
                  <a href={whatsapp} target="_blank" rel="noreferrer" className="btn-glass">
                    <MessageCircle aria-hidden="true" className="size-3.5" /> WhatsApp
                  </a>
                ) : null}
                {supplier.email ? (
                  <a href={`mailto:${supplier.email}`} className="btn-glass">
                    <Mail aria-hidden="true" className="size-3.5" /> Email
                  </a>
                ) : null}
              </div>
            </div>

            <Disclosure
              title={serviceMode ? "Provider snapshot" : "Supplier snapshot"}
              defaultOpen
              expandedFrom="xl"
            >
              <div className="grid grid-cols-2 gap-2 xl:grid-cols-1">
                {supplier.yearsInBusiness > 0 && (
                  <SnapshotFact
                    icon={<TrendingUp aria-hidden="true" className="size-4 text-brand-600" />}
                    label="Years in business"
                    value={`${supplier.yearsInBusiness}`}
                  />
                )}
                {supplier.responseTimeHours ? (
                  <SnapshotFact
                    icon={<Clock3 aria-hidden="true" className="size-4 text-brand-600" />}
                    label="Average reply"
                    value={`${supplier.responseTimeHours}h`}
                  />
                ) : null}
                {supplier.deliveryDays ? (
                  <SnapshotFact
                    icon={<Truck aria-hidden="true" className="size-4 text-brand-600" />}
                    label={serviceMode ? "Visit lead" : "Delivery lead"}
                    value={`${supplier.deliveryDays}d`}
                  />
                ) : null}
                <SnapshotFact
                  icon={<MapPin aria-hidden="true" className="size-4 text-brand-600" />}
                  label="Base location"
                  value={supplier.location}
                />
                <SnapshotFact
                  icon={<ShoppingBag aria-hidden="true" className="size-4 text-brand-600" />}
                  label={serviceMode ? "Jobs done" : "Items sold"}
                  value={soldCountLabel}
                />
                {supplier.email ? (
                  <SnapshotFact
                    icon={<Mail aria-hidden="true" className="size-4 text-brand-600" />}
                    label="Email"
                    value={supplier.email}
                    href={`mailto:${supplier.email}`}
                    wide
                  />
                ) : null}
              </div>
            </Disclosure>

            {supplier.serviceAreas?.length > 0 && (
              <Disclosure
                title="Service areas"
                meta={`${supplier.serviceAreas.length}`}
                expandedFrom="xl"
              >
                <div className="flex flex-wrap gap-1.5">
                  {supplier.serviceAreas.map((area) => (
                    <span
                      key={area}
                      className="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-700"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </Disclosure>
            )}

            {(hasBrands || hasCerts) && (
              <Disclosure
                title={
                  hasBrands && hasCerts
                    ? "Brands and certifications"
                    : hasBrands
                      ? "Brands carried"
                      : "Certifications"
                }
                expandedFrom="xl"
              >
                {hasBrands && (
                  <>
                    {hasCerts && (
                      <p className="mb-1.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-ink-500">
                        Brands carried
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {supplier.brands?.map((brand) => (
                        <span
                          key={brand}
                          className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700"
                        >
                          {brand}
                        </span>
                      ))}
                    </div>
                  </>
                )}
                {hasCerts && (
                  <>
                    {hasBrands && (
                      <p className="mb-1.5 mt-3 text-[0.6875rem] font-semibold uppercase tracking-wider text-ink-500">
                        Certifications
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {supplier.certifications?.map((certification) => (
                        <span
                          key={certification}
                          className="rounded-full bg-gold-100 px-2.5 py-1 text-xs font-semibold text-gold-800"
                        >
                          {certification}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </Disclosure>
            )}
          </aside>
        </div>
      </section>

      <MobileActionBar label={serviceMode ? "Book this provider" : "Contact this supplier"}>
        <Link href={quoteHref} className="btn-tactile flex-1">
          <FileText aria-hidden="true" className="size-4" />
          Get a quote
        </Link>
        {call ? (
          <a
            href={call}
            aria-label={`Call ${supplier.name}`}
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
            aria-label={`WhatsApp ${supplier.name}`}
            className="btn-glass size-11 shrink-0 !p-0"
          >
            <MessageCircle aria-hidden="true" className="size-4" />
          </a>
        ) : null}
      </MobileActionBar>
    </main>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  // Markup keeps dt before dd; phones flip it so the figure sits above its label.
  return (
    <div className="flex min-w-0 flex-col-reverse rounded-xl border border-white/12 bg-white/8 px-1.5 py-1.5 text-center backdrop-blur-sm sm:flex-col sm:rounded-[1.5rem] sm:px-4 sm:py-3 sm:text-left">
      <dt className="text-xs font-medium leading-tight text-brand-100/80 sm:text-[0.6875rem] sm:font-semibold sm:uppercase sm:tracking-wider">
        {label}
      </dt>
      <dd className="truncate text-sm font-semibold tabular-nums text-white sm:mt-1 sm:text-lg">
        {value}
      </dd>
    </div>
  );
}

function InfoCard({
  label,
  value,
  note,
}: {
  label: string;
  value: number;
  note: string;
}) {
  return (
    <li className="min-w-0 rounded-2xl border border-border/70 bg-white p-3 shadow-(--shadow-card) sm:rounded-[1.75rem] sm:p-4">
      <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-brand-700">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-ink-900 sm:mt-2 sm:text-2xl">
        <CountUp value={value} />
      </p>
      <p className="mt-1 hidden text-sm text-ink-600 sm:block">{note}</p>
    </li>
  );
}

function SnapshotFact({
  icon,
  label,
  value,
  href,
  wide = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  href?: string;
  wide?: boolean;
}) {
  const className = `flex min-h-11 min-w-0 items-start gap-2 rounded-xl bg-ink-50/80 px-2.5 py-2 ${wide ? "col-span-2 xl:col-span-1" : ""}`;
  const body = (
    <>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-ink-500">
          {label}
        </p>
        <p
          className={`mt-0.5 text-[0.8125rem] font-medium ${href ? "truncate text-brand-700" : "text-ink-900"}`}
        >
          {value}
        </p>
      </div>
    </>
  );
  return href ? (
    <a href={href} className={`${className} transition-colors hover:bg-brand-50`}>
      {body}
    </a>
  ) : (
    <div className={className}>{body}</div>
  );
}

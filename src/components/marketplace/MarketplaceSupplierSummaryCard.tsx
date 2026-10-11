import {
  Boxes,
  Clock3,
  FileText,
  MapPin,
  ShieldCheck,
  ShoppingBag,
  TrendingUp,
  Truck,
} from "lucide-react";
import Link from "next/link";

import { CardFact } from "@/components/common/card-fact";
import { GoldStar } from "@/components/marketplace/card-icons";
import { MediaImage } from "@/components/marketplace/MediaImage";
import {
  formatCompactBd,
  supplierInitials,
} from "@/components/marketplace/supplier-media-utils";
import { ROUTES } from "@/config/routes.config";
import { CARD_BLUR_DATA_URL } from "@/lib/image-placeholder";
import type { Supplier } from "@/types/marketplace.types";
import { isServiceKind } from "@/utils/marketplace-kind";

/** The supplier list payload carries at most this many products per supplier. */
const PRODUCT_PREVIEW_CAP = 8;

/**
 * Supplier listing card. Phones: the compact row (square thumbnail left, facts
 * right, about 120px tall, the whole card is one link). From `md` it opens up
 * into the wide card with two actions. The title link is stretched over the
 * card, so the markup stays valid while the whole row is tappable.
 */
export function MarketplaceSupplierSummaryCard({
  supplier,
  categorySlug,
}: {
  supplier: Supplier;
  categorySlug: string;
}) {
  const imageSrc =
    supplier.coverImage ?? supplier.gallery?.[0] ?? supplier.logo ?? undefined;
  const profileHref = ROUTES.MARKETPLACE_SUPPLIER(supplier.slug);
  const quoteHref = `${ROUTES.MARKETPLACE_QUOTE}?supplierSlug=${supplier.slug}&categorySlug=${categorySlug}`;
  const service = isServiceKind(supplier.kind);
  const productCount = supplier.products?.length ?? 0;
  const hasRating = supplier.rating > 0;

  const facts: { key: string; node: React.ReactNode }[] = [];
  if (supplier.isVerified) {
    facts.push({
      key: "verified",
      node: <CardFact icon={ShieldCheck}>Verified</CardFact>,
    });
  }
  if (hasRating) {
    facts.push({
      key: "rating",
      node: (
        <CardFact icon={GoldStar}>
          {supplier.rating.toFixed(1)}
          <span className="font-normal text-ink-500">({supplier.reviewCount})</span>
        </CardFact>
      ),
    });
  }
  if (productCount > 0) {
    facts.push({
      key: "products",
      node: (
        <CardFact icon={Boxes}>
          {productCount >= PRODUCT_PREVIEW_CAP ? `${PRODUCT_PREVIEW_CAP}+` : productCount}{" "}
          {service ? "package" : "product"}
          {productCount === 1 ? "" : "s"}
        </CardFact>
      ),
    });
  }
  if (supplier.deliveryDays && supplier.deliveryDays > 0) {
    facts.push({
      key: "delivery",
      node: (
        <CardFact icon={Truck}>
          {supplier.deliveryDays}d {service ? "visit lead" : "delivery"}
        </CardFact>
      ),
    });
  }
  if (supplier.yearsInBusiness > 0) {
    facts.push({
      key: "years",
      node: <CardFact icon={TrendingUp}>{supplier.yearsInBusiness} yrs</CardFact>,
    });
  }
  if (supplier.responseTimeHours) {
    facts.push({
      key: "reply",
      node: <CardFact icon={Clock3}>Replies in {supplier.responseTimeHours}h</CardFact>,
    });
  }
  if (typeof supplier.itemsSold === "number" && supplier.itemsSold > 0) {
    facts.push({
      key: "sold",
      node: (
        <CardFact icon={ShoppingBag}>
          {formatCompactBd(supplier.itemsSold)} {service ? "jobs" : "sold"}
        </CardFact>
      ),
    });
  }

  return (
    <article
      data-card
      className="group relative min-w-0 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-(--shadow-card) transition-[translate,scale,box-shadow] duration-200 active:scale-[0.99] md:rounded-3xl md:hover:-translate-y-0.5 md:hover:shadow-(--shadow-elevated) motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100"
    >
      <div className="flex gap-2.5 p-2 md:grid md:grid-cols-[170px_minmax(0,1fr)_auto] md:items-center md:gap-6 md:p-5">
        <div className="relative aspect-square w-25 shrink-0 self-start overflow-hidden rounded-xl bg-brand-100 md:w-full md:rounded-2xl">
          <MediaImage
            src={imageSrc}
            alt=""
            fill
            unoptimized
            sizes="(min-width: 768px) 170px, 100px"
            placeholder="blur"
            blurDataURL={CARD_BLUR_DATA_URL}
            className="object-cover"
            fallback={
              <span className="flex size-full items-center justify-center bg-linear-to-br from-brand-100 to-brand-200 font-heading text-2xl font-semibold text-brand-700 md:text-4xl">
                {supplierInitials(supplier.name)}
              </span>
            }
          />
          <span
            className={
              "absolute left-1.5 top-1.5 inline-flex rounded-full px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wide shadow-sm " +
              (supplier.isFeatured
                ? "bg-gold-400 text-brand-950"
                : "bg-white/90 text-ink-700")
            }
          >
            {supplier.isFeatured ? "Featured" : service ? "Service" : "Supplier"}
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="line-clamp-1 font-heading text-[0.95rem] font-semibold leading-tight text-ink-900 transition-colors group-hover:text-brand-700 md:line-clamp-2 md:text-2xl">
            <Link
              href={profileHref}
              className="outline-none after:absolute after:inset-0 after:rounded-[inherit] focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-brand-400"
            >
              {supplier.name}
            </Link>
          </h3>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-500 md:mt-1.5 md:text-sm">
            <MapPin aria-hidden="true" className="size-3 shrink-0 md:size-3.5" />
            <span className="truncate">{supplier.location}</span>
          </p>
          {supplier.tagline ? (
            <p className="mt-1 hidden line-clamp-2 text-sm leading-relaxed text-ink-700 md:block">
              {supplier.tagline}
            </p>
          ) : null}

          <ul className="mt-1.5 flex flex-wrap gap-x-2.5 gap-y-0.5 md:mt-3 md:gap-x-4 md:gap-y-1.5">
            {facts.map((fact, index) => (
              <li key={fact.key} className={index >= 4 ? "hidden md:block" : undefined}>
                {fact.node}
              </li>
            ))}
          </ul>

          <p className="mt-auto truncate pt-1.5 text-[0.95rem] font-extrabold leading-tight tabular-nums text-gold-700 md:pt-3">
            {supplier.priceRange ?? "Price on request"}
          </p>
        </div>

        {/* Wide screens: explicit actions above the stretched link. */}
        <div className="relative z-10 hidden flex-col items-stretch gap-2 md:flex">
          <Link href={profileHref} className="btn-tactile btn-tactile--sm">
            View supplier
          </Link>
          <Link href={quoteHref} className="btn-glass">
            <FileText aria-hidden="true" className="size-4" />
            Request quote
          </Link>
        </div>
      </div>
    </article>
  );
}

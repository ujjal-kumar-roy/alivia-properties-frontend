"use client";

import {
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  MapPin,
  Maximize2,
  Phone,
  Play,
  ShoppingBag,
  Star,
  Truck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { MediaLightbox } from "@/components/marketplace/MediaLightbox";
import {
  buildSupplierMediaItems,
  formatCompactBd,
  isDirectSupplierVideo,
  supplierInitials,
  toSupplierVideoEmbedUrl,
} from "@/components/marketplace/supplier-media-utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ROUTES } from "@/config/routes.config";
import { cn } from "@/lib/utils";
import type { Supplier } from "@/types/marketplace.types";

function hashId(id: string) {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function MetricTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "good" | "danger";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-2 py-1.5 sm:rounded-2xl sm:px-3.5 sm:py-3",
        tone === "good" && "border-emerald-200 bg-emerald-50",
        tone === "danger" && "border-red-200 bg-red-50",
        tone === "default" && "border-border/70 bg-ink-50/70",
      )}
    >
      <p className="truncate text-[0.6875rem] font-semibold uppercase tracking-wide text-ink-500 sm:tracking-[0.16em]">
        {label}
      </p>
      <p className="mt-0.5 text-base font-semibold tabular-nums text-ink-900 sm:mt-1 sm:text-lg">{value}</p>
    </div>
  );
}

export function MarketplaceSupplierShowcaseCard({
  supplier,
  categorySlug,
}: {
  supplier: Supplier;
  categorySlug: string;
}) {
  const { items, images } = useMemo(
    () => buildSupplierMediaItems(supplier),
    [supplier],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [videoOpen, setVideoOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const activeItem = items[activeIndex] ?? items[0] ?? null;
  const products = supplier.products ?? [];
  const popularProducts = products.slice(0, 3);
  const inStockCount = products.filter((product) => product.inStock).length;
  const outOfStockCount = Math.max(0, products.length - inStockCount);
  const overallInStock = supplier.inStock !== false;
  const stockCountLabel =
    products.length > 0 ? `${inStockCount}` : overallInStock ? "1" : "0";
  const outStockLabel =
    products.length > 0 ? `${outOfStockCount}` : overallInStock ? "0" : "1";
  const quoteHref = `${ROUTES.MARKETPLACE_QUOTE}?supplierSlug=${supplier.slug}&categorySlug=${categorySlug}`;
  const embedUrl = toSupplierVideoEmbedUrl(supplier.videoUrl);

  const [liveViewers, setLiveViewers] = useState(() => {
    const seed = hashId(supplier.id);
    const demandBoost = Math.max(0, Math.round((supplier.itemsSold ?? 0) / 90));
    return 8 + (seed % 21) + demandBoost;
  });

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      setLiveViewers((current) => {
        const next = current + (Math.floor(Math.random() * 5) - 2);
        return Math.max(6, Math.min(68, next));
      });
    }, 4000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <>
      <article data-card className="group overflow-hidden rounded-2xl border border-border/70 bg-white shadow-(--shadow-card) sm:rounded-[28px] transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-(--shadow-elevated) motion-reduce:transform-none motion-reduce:transition-none">
        <div className="grid lg:grid-cols-[0.92fr_1.08fr]">
          <div className="flex flex-col border-b border-border/70 lg:border-r lg:border-b-0">
            <div className="relative aspect-video overflow-hidden bg-brand-100 sm:aspect-16/10 lg:aspect-auto lg:min-h-0 lg:flex-1">
              {activeItem ? (
                activeItem.type === "image" ? (
                  <button
                    type="button"
                    aria-label={`Open ${supplier.name} photo in full screen`}
                    onClick={() =>
                      setLightboxIndex(images.indexOf(activeItem.src))
                    }
                    className="group/zoom absolute inset-0 cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
                  >
                    <Image
                      src={activeItem.src}
                      alt={`${supplier.name} photo`}
                      fill
                      unoptimized
                      sizes="(max-width: 1024px) 100vw, 42vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transform-none motion-reduce:transition-none"
                    />
                    <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover/zoom:opacity-100 motion-reduce:transition-none">
                      <Maximize2 aria-hidden="true" className="size-3" />
                      Tap to zoom
                    </span>
                  </button>
                ) : activeItem.poster ? (
                  <Image
                    src={activeItem.poster}
                    alt={`${supplier.name} video preview`}
                    fill
                    unoptimized
                    sizes="(max-width: 1024px) 100vw, 42vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center bg-linear-to-br from-brand-100 via-brand-200 to-gold-100">
                    <span className="font-heading text-6xl font-semibold text-brand-700/35">
                      {supplierInitials(supplier.name)}
                    </span>
                  </div>
                )
              ) : (
                <div className="flex size-full items-center justify-center bg-linear-to-br from-brand-100 via-brand-200 to-gold-100">
                  <span className="font-heading text-6xl font-semibold text-brand-700/35">
                    {supplierInitials(supplier.name)}
                  </span>
                </div>
              )}

              <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent" />

              <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold",
                    overallInStock
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-red-50 text-red-700",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-2 rounded-full",
                      overallInStock ? "bg-emerald-500" : "bg-red-500",
                    )}
                  />
                  {overallInStock ? "In Stock" : "Out of Stock"}
                </span>

                {supplier.isVerified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-brand-700">
                    <CheckCircle2 aria-hidden="true" className="size-3.5" />
                    Verified
                  </span>
                )}
              </div>

              <div
                aria-hidden="true"
                className="pointer-events-none absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm"
              >
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:hidden" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
                </span>
                <Eye aria-hidden="true" className="size-3.5" />
                {formatCompactBd(liveViewers)} Live Views
              </div>

              {activeItem?.type === "video" && (
                <button
                  type="button"
                  aria-label={`Play ${supplier.name} video`}
                  onClick={() => setVideoOpen(true)}
                  className="absolute left-1/2 top-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/92 text-brand-700 shadow-lg transition-transform duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white motion-reduce:transition-none"
                >
                  <Play
                    aria-hidden="true"
                    className="size-6 translate-x-0.5 fill-current"
                  />
                </button>
              )}
            </div>

            {items.length > 1 && (
              <div className="hidden grid-cols-5 gap-2 border-t border-border/60 bg-ink-50/60 p-3 sm:grid sm:grid-cols-6">
                {items.map((item, index) => {
                  const thumbSrc =
                    item.type === "image" ? item.src : item.poster;
                  return (
                    <button
                      key={`${item.type}-${index}`}
                      type="button"
                      aria-label={
                        item.type === "video"
                          ? `Show ${supplier.name} video`
                          : `Show photo ${index + 1} for ${supplier.name}`
                      }
                      aria-pressed={index === activeIndex}
                      onClick={() => setActiveIndex(index)}
                      className={cn(
                        "relative aspect-4/3 overflow-hidden rounded-xl border-2 bg-ink-100 transition-[border-color,opacity] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
                        index === activeIndex
                          ? "border-brand-500"
                          : "border-transparent opacity-70 hover:opacity-100",
                      )}
                    >
                      {thumbSrc ? (
                        <Image
                          src={thumbSrc}
                          alt=""
                          fill
                          unoptimized
                          sizes="96px"
                          className="object-cover"
                        />
                      ) : (
                        <span className="flex size-full items-center justify-center text-xs font-semibold text-brand-700">
                          {supplierInitials(supplier.name)}
                        </span>
                      )}
                      {item.type === "video" && (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <span className="flex size-6 items-center justify-center rounded-full bg-white/90 text-brand-700">
                            <Play
                              aria-hidden="true"
                              className="size-3 translate-x-px fill-current"
                            />
                          </span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-col p-3.5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-700">
                {supplier.kind === "service" || supplier.kind === "SERVICE"
                  ? "Service Team"
                  : "Material Supplier"}
              </span>
              {supplier.isFeatured && (
                <span className="rounded-full bg-gold-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-800">
                  Top Pick
                </span>
              )}
            </div>

            <div className="mt-4 flex items-start gap-3">
              <span className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-ink-50 text-base font-semibold text-brand-700">
                {supplier.logo ? (
                  <Image
                    src={supplier.logo}
                    alt={`${supplier.name} logo`}
                    fill
                    unoptimized
                    sizes="56px"
                    className="object-contain p-2"
                  />
                ) : (
                  supplierInitials(supplier.name)
                )}
              </span>

              <div className="min-w-0 flex-1">
                <Link
                  href={ROUTES.MARKETPLACE_SUPPLIER(supplier.slug)}
                  className="font-heading text-xl font-semibold text-ink-900 transition-colors hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 sm:text-2xl"
                >
                  {supplier.name}
                </Link>

                {supplier.tagline && (
                  <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-700">
                    {supplier.tagline}
                  </p>
                )}

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-600">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin
                      aria-hidden="true"
                      className="size-3.5 text-brand-600"
                    />
                    {supplier.location}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Star
                      aria-hidden="true"
                      className="size-3.5 fill-gold-400 text-gold-400"
                    />
                    {supplier.rating.toFixed(1)} / 5 ({supplier.reviewCount})
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-4 gap-1.5 sm:mt-5 sm:grid-cols-2 sm:gap-3">
              <MetricTile
                label="In Stock"
                value={stockCountLabel}
                tone="good"
              />
              <MetricTile
                label="Out Stock"
                value={outStockLabel}
                tone={
                  outOfStockCount > 0 || !overallInStock ? "danger" : "default"
                }
              />
              <MetricTile
                label="Items Sold"
                value={
                  typeof supplier.itemsSold === "number" &&
                  supplier.itemsSold > 0
                    ? formatCompactBd(supplier.itemsSold)
                    : "New"
                }
              />
              <MetricTile
                label="Real-Time View"
                value={formatCompactBd(liveViewers)}
              />
            </div>

            <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 sm:mt-5 sm:rounded-[24px] sm:px-4 sm:py-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-red-600">
                Bangladesh Market Price
              </p>
              <p className="mt-1 text-lg font-bold text-red-700">
                {supplier.priceRange ?? "Price on request"}
              </p>
            </div>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-ink-600 sm:mt-5 sm:gap-y-2">
              {supplier.responseTimeHours ? (
                <span className="inline-flex items-center gap-1.5">
                  <Clock3
                    aria-hidden="true"
                    className="size-3.5 text-brand-600"
                  />
                  Replies in about {supplier.responseTimeHours}h
                </span>
              ) : null}
              {supplier.deliveryDays ? (
                <span className="inline-flex items-center gap-1.5">
                  <Truck
                    aria-hidden="true"
                    className="size-3.5 text-brand-600"
                  />
                  Delivery in {supplier.deliveryDays} day
                  {supplier.deliveryDays === 1 ? "" : "s"}
                </span>
              ) : null}
            </div>

            {popularProducts.length > 0 && (
              <div className="mt-5 hidden sm:block">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-500">
                  Popular Supply Lines
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {popularProducts.map((product) => (
                    <Link
                      key={product.id}
                      href={ROUTES.MARKETPLACE_PRODUCT(product.slug)}
                      className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-white px-3 py-1.5 text-xs font-medium text-ink-700 transition-colors hover:border-brand-200 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                    >
                      <ShoppingBag aria-hidden="true" className="size-3" />
                      <span className="max-w-40 truncate">{product.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {(supplier.serviceAreas?.length ?? 0) > 0 && (
              <div className="mt-4 hidden sm:block">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-500">
                  Coverage
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {supplier.serviceAreas.slice(0, 4).map((area) => (
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

            <div className="mt-4 flex flex-wrap gap-2 sm:mt-6">
              <Link
                href={quoteHref}
                className="btn-tactile btn-tactile--sm btn-tactile--gold flex-1 sm:flex-none"
              >
                <FileText aria-hidden="true" className="size-4" />
                Request a Quote
              </Link>
              <Link href={ROUTES.MARKETPLACE_SUPPLIER(supplier.slug)} className="btn-glass">
                View Profile
              </Link>
              <a href={`tel:${supplier.phone}`} className="btn-glass">
                <Phone aria-hidden="true" className="size-4" />
                Call Now
              </a>
            </div>
          </div>
        </div>
      </article>

      {images.length > 0 && (
        <MediaLightbox
          images={images}
          index={lightboxIndex ?? 0}
          open={lightboxIndex !== null}
          onOpenChange={(v) =>
            setLightboxIndex(v ? (lightboxIndex ?? 0) : null)
          }
          onIndexChange={setLightboxIndex}
          label={supplier.name}
        />
      )}

      {supplier.videoUrl && (
        <Dialog open={videoOpen} onOpenChange={setVideoOpen}>
          <DialogContent className="max-w-4xl bg-black p-2 sm:p-3">
            <DialogTitle className="sr-only">{supplier.name} Video</DialogTitle>
            {embedUrl ? (
              <iframe
                src={embedUrl}
                title={`${supplier.name} video`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="aspect-video w-full rounded-2xl border-0 bg-black"
              />
            ) : isDirectSupplierVideo(supplier.videoUrl) ? (
              <video
                src={supplier.videoUrl}
                controls
                playsInline
                className="aspect-video w-full rounded-2xl bg-black"
              />
            ) : (
              <div className="rounded-2xl bg-white p-5 text-sm text-ink-700">
                <p className="font-medium text-ink-900">
                  Video preview unavailable.
                </p>
                <a
                  href={supplier.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex text-brand-700 underline underline-offset-4 hover:text-brand-800"
                >
                  Open video in a new tab
                </a>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

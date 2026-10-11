export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  MapPin,
  Phone,
  MessageCircle,
  ChevronRight,
  Building2,
  BedDouble,
  Bath,
  Maximize2,
  CalendarDays,
  ShieldCheck,
  ArrowRight,
  Eye,
  Tag,
  Clock,
  Navigation,
  FileText,
  Sparkles,
  Ruler,
  Clapperboard,
  FolderOpen,
  Calculator,
  TrendingUp,
  Landmark,
  MessageCircleQuestion,
  Star,
  HandCoins,
} from "lucide-react";
import { getProperty, getProperties } from "@/services/properties.service";
import { getDocuments } from "@/services/documents.service";
import { formatPrice } from "@/utils/format-price";
import { toMapEmbedUrl } from "@/utils/map-embed";
import { ROUTES } from "@/config/routes.config";
import { VerifiedBadge } from "@/components/common/verified-badge";
import { PropertyCard } from "@/components/properties/property-card";
import { PropertyGallery } from "@/components/properties/property-gallery";
import { MortgageCalculator } from "@/components/properties/mortgage-calculator";
import { ReportListingDialog } from "@/components/properties/report-listing-dialog";
// 360° virtual tour temporarily disabled on the frontend — map option stays enabled.
// import { VirtualTour } from "@/components/properties/virtual-tour";
import { FloorPlan } from "@/components/properties/floor-plan";
import { VideoReel } from "@/components/properties/video-reel";
import { DocumentVault } from "@/components/properties/document-vault";
import { EmiBankCompare } from "@/components/properties/emi-bank-compare";
import { RoiCalculator } from "@/components/properties/roi-calculator";
import { OfferFlow } from "@/components/properties/offer-flow";
import { PropertyViewTracker } from "@/components/properties/property-view-tracker";
import { ReviewsSection } from "@/components/properties/reviews-section";
import { QASection } from "@/components/properties/qa-section";
import { SellerInquiryForm } from "@/components/properties/seller-inquiry-form";
import { PropertyActionBar } from "@/components/properties/property-action-bar";
import { DetailSection } from "@/components/properties/detail-section";
import {
  getPropertySpecs,
  whatsappNumber,
} from "@/components/properties/property-facts";
import { StructuredData } from "@/components/seo/structured-data";
import { siteConfig } from "@/config/site.config";

interface PropertyDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function PropertyDetailPage({
  params,
}: PropertyDetailPageProps) {
  const { slug } = await params;
  const res = await getProperty(slug);
  if (!res.success) notFound();
  const p = res.data;

  const similarRes = await getProperties({
    type: p.type,
    division: p.division,
    limit: 3,
  });
  const similar = similarRes.data.filter((s) => s.id !== p.id).slice(0, 3);

  const docsRes = await getDocuments(p.id).catch(() => null);
  const documents = docsRes?.data ?? [];

  const floorLevels =
    p.images.length >= 2
      ? [
          {
            label: "Ground",
            imageUrl: p.images[0],
            sizeSqft: Math.round(p.size * 0.55),
          },
          {
            label: "Upper",
            imageUrl: p.images[1],
            sizeSqft: Math.round(p.size * 0.45),
          },
        ]
      : [];

  const reels = p.images.slice(0, 4).map((img, i) => ({
    id: `reel-${i}`,
    videoUrl: p.videoUrl ?? "",
    poster: img,
    caption:
      i === 0
        ? "Living room walkthrough"
        : i === 1
          ? "Kitchen + utility tour"
          : i === 2
            ? "Master bedroom"
            : "Balcony view",
    duration: ["0:23", "0:31", "0:18", "0:42"][i] ?? "0:30",
  }));

  // Rentals can be monthly or yearly; the listing says which.
  const pricePer =
    p.purpose === "rent"
      ? p.rentPeriod?.toLowerCase() === "yearly"
        ? "/year"
        : "/month"
      : null;
  const priceMain = formatPrice(p.price);
  const displayPrice = `${priceMain}${pricePer ?? ""}`;
  const publishedDate = new Intl.DateTimeFormat("en-BD", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(p.createdAt));

  const locationQuery = encodeURIComponent(
    [p.address, p.area, p.district, p.division].filter(Boolean).join(", "),
  );
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${locationQuery}`;
  const mapEmbedUrl = toMapEmbedUrl(p.mapPin) ?? toMapEmbedUrl(p.address);

  const waNumber = whatsappNumber(p.sellerWhatsApp);
  const whatsappHref = waNumber
    ? `https://wa.me/${waNumber}?text=${encodeURIComponent(`Interested in: ${p.title}`)}`
    : null;

  const schema = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: p.title,
    description: p.description,
    url: `${siteConfig.url}${ROUTES.PROPERTY_DETAIL(p.slug)}`,
    image: p.images[0],
    offers: { "@type": "Offer", price: p.price, priceCurrency: "BDT" },
  };

  const specCards = [
    p.bedrooms !== undefined
      ? { icon: BedDouble, label: "Bedrooms", value: String(p.bedrooms) }
      : null,
    p.bathrooms !== undefined
      ? { icon: Bath, label: "Bathrooms", value: String(p.bathrooms) }
      : null,
    { icon: Maximize2, label: "Size", value: `${p.size} ${p.sizeUnit}` },
    p.floorNumber !== undefined
      ? { icon: Building2, label: "Floor", value: `Floor ${p.floorNumber}` }
      : null,
  ].filter(Boolean) as {
    icon: typeof BedDouble;
    label: string;
    value: string;
  }[];

  // Phones: one compact two-column grid replaces the stat cards and the spec cards.
  const phoneFacts = [
    ...getPropertySpecs(p),
    {
      key: "pricing",
      icon: Tag,
      label: "Pricing",
      value: p.priceNegotiable ? "Negotiable" : "Fixed price",
    },
  ];

  const isSale = p.purpose === "sale";
  const hasBuiltSpace = p.type !== "plot" && p.type !== "land";
  const verifiedDocs = documents.filter((d) => d.isVerified).length;

  return (
    <>
      <StructuredData data={schema} />
      <PropertyViewTracker propertyId={p.id} />

      <div className="hidden border-b border-border bg-ink-50 sm:block">
        <div className="container-page flex items-center gap-1.5 py-1.5 text-xs text-muted-foreground">
          <Link href={ROUTES.HOME} className="inline-flex min-h-8 items-center hover:text-foreground">
            Home
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link href={ROUTES.PROPERTIES} className="inline-flex min-h-8 items-center hover:text-foreground">
            Properties
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="max-w-48 line-clamp-1 font-medium text-foreground">
            {p.title}
          </span>
        </div>
      </div>

      <div className="container-page section-y pt-2 sm:pt-10">
        <div className="grid gap-3 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:gap-8">
          <div className="order-2 min-w-0 space-y-3 lg:order-none lg:space-y-6">
            <div className="space-y-2 lg:space-y-4">
              <div className="flex flex-wrap items-center gap-1.5 lg:gap-2">
                {p.isFeatured && <VerifiedBadge type="featured" />}
                {p.isVerified && <VerifiedBadge type="verified" />}
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    p.purpose === "rent"
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700"
                  }`}
                >
                  For {p.purpose === "rent" ? "Rent" : "Sale"}
                </span>
              </div>

              <div>
                <h1 className="font-heading text-[1.375rem] font-bold leading-snug tracking-tight text-balance sm:text-[clamp(1.75rem,4.5vw,3.75rem)] sm:leading-[1.1] lg:max-w-4xl">
                  {p.title}
                </h1>
                <p className="mt-2 flex flex-wrap items-baseline gap-x-2 text-2xl font-extrabold tabular-nums text-brand-700 sm:mt-3 sm:text-3xl sm:font-semibold">
                  <span>{displayPrice}</span>
                  {p.priceNegotiable && (
                    <span className="rounded-full bg-gold-100 px-2 py-0.5 text-xs font-bold text-gold-800 sm:hidden">
                      Negotiable
                    </span>
                  )}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-500 sm:mt-3">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 shrink-0 text-brand-600" />
                    {p.address ?? `${p.area}, ${p.district}`}
                  </span>
                  <span className="hidden text-ink-300 sm:inline">•</span>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4 shrink-0 text-brand-600" />
                    Listed {publishedDate}
                  </span>
                </div>
              </div>
            </div>

            <div className="hidden grid-cols-3 gap-2.5 lg:grid">
              <div className="surface-card flex flex-col gap-1.5 p-4">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-500">
                  <Eye className="size-3.5 text-brand-600" /> Views
                </span>
                <span className="text-xl font-semibold text-ink-900">
                  {p.viewCount.toLocaleString("en-US")}
                </span>
              </div>
              <div className="surface-card flex flex-col gap-1.5 p-4">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-500">
                  <Tag className="size-3.5 text-brand-600" /> Pricing
                </span>
                <span className="text-sm font-semibold text-ink-900">
                  {p.priceNegotiable ? "Negotiable" : "Fixed price"}
                </span>
              </div>
              <div className="surface-card flex flex-col gap-1.5 p-4">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-500">
                  <Building2 className="size-3.5 text-brand-600" /> Type
                </span>
                <span className="text-sm font-semibold capitalize text-ink-900">
                  {p.type}
                </span>
              </div>
            </div>

            {/* Phones and tablets: key facts, two to a row. */}
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:hidden">
              {phoneFacts.map(({ key, icon: Icon, label, value }) => (
                <li
                  key={key}
                  className="flex min-w-0 items-center gap-2.5 rounded-xl border border-black/5 bg-white px-3 py-2 shadow-(--shadow-card) odd:last:col-span-2 sm:odd:last:col-span-1"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold leading-tight text-ink-900">
                      {value}
                    </span>
                    <span className="block truncate text-xs text-ink-500">{label}</span>
                  </span>
                </li>
              ))}
              {p.viewCount > 0 && (
                <li className="col-span-2 flex items-center gap-1.5 px-1 text-xs text-ink-500">
                  <Eye aria-hidden="true" className="size-3.5" />
                  {p.viewCount.toLocaleString("en-BD")} views
                </li>
              )}
            </ul>
          </div>

          <div className="order-1 min-w-0 lg:order-none">
            <PropertyGallery property={p} />
          </div>
        </div>

        {/* Phones: the two columns dissolve (`contents`) so every section is one
            grid item and can be ordered; from lg they are the real columns again. */}
        <div className="mt-3 grid grid-cols-1 gap-2.5 lg:mt-10 lg:grid-cols-[1.3fr_0.7fr] lg:gap-10">
          <div className="contents lg:block lg:min-w-0 lg:space-y-8">
            <div className="hidden grid-cols-2 gap-4 sm:grid-cols-4 lg:grid">
              {specCards.map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className="surface-card p-4 text-center transition-shadow hover:shadow-(--shadow-elevated)"
                >
                  <Icon className="mx-auto h-4 w-4 text-brand-600" />
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-ink-500">
                    {label}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-ink-900">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <DetailSection
              id="description"
              title="Description"
              icon={FileText}
              defaultOpen
              className="order-1"
            >
              <p className="text-[0.9375rem] leading-relaxed text-ink-600 lg:text-sm">
                {p.description}
              </p>
            </DetailSection>

            {/* A floor plan only makes sense for built spaces, not bare plots/land. */}
            {hasBuiltSpace && (
              <>
                {/* 360° virtual tour temporarily disabled on the frontend — map option stays enabled.
                    When it comes back, wrap it like the sections below:
                <DetailSection title="Virtual tour" icon={View} className="order-4">
                  <VirtualTour
                    posterImage={p.images[0]}
                    panoramaUrl={p.panoramaUrl}
                    title="Virtual 360° Tour"
                  />
                </DetailSection>
                */}
                {floorLevels.length > 0 && (
                  <DetailSection
                    title="Floor plan"
                    hint={`${floorLevels.length} levels`}
                    icon={Ruler}
                    className="order-4"
                  >
                    <FloorPlan levels={floorLevels} embedded />
                  </DetailSection>
                )}
              </>
            )}

            <DetailSection title="Video reels" icon={Clapperboard} className="order-5">
              <VideoReel reels={reels} embedded />
            </DetailSection>

            {documents.length > 0 && (
              <DetailSection
                title="Document vault"
                hint={`${verifiedDocs} of ${documents.length} verified`}
                icon={FolderOpen}
                className="order-6"
              >
                <DocumentVault documents={documents} embedded />
              </DetailSection>
            )}

            {isSale && (
              <>
                {/* The desktop page keeps the mortgage estimate in the sidebar. */}
                <DetailSection
                  title="Mortgage estimate"
                  hint="Plan financing quickly"
                  icon={Calculator}
                  className="order-7 lg:hidden"
                >
                  <MortgageCalculator propertyPrice={p.price} embedded />
                </DetailSection>
                <DetailSection
                  title="ROI calculator"
                  hint="Yield, appreciation and total return"
                  icon={TrendingUp}
                  className="order-8"
                >
                  <RoiCalculator propertyPrice={p.price} embedded />
                </DetailSection>
                <DetailSection
                  title="Bank EMI comparison"
                  hint="Live partner-bank rates"
                  icon={Landmark}
                  className="order-9"
                >
                  <EmiBankCompare propertyPrice={p.price} embedded />
                </DetailSection>
              </>
            )}

            <DetailSection
              title="Questions & answers"
              hint="Ask the seller anything about this listing"
              icon={MessageCircleQuestion}
              className="order-10"
            >
              <QASection propertyId={p.id} embedded />
            </DetailSection>
            <DetailSection
              title="Reviews"
              hint="Verified guest ratings"
              icon={Star}
              className="order-11"
            >
              <ReviewsSection targetType="property" targetId={p.id} embedded />
            </DetailSection>

            {p.facilities.length > 0 && (
              <DetailSection
                title="Facilities"
                hint={`${p.facilities.length} amenities`}
                icon={Sparkles}
                className="order-2"
              >
                <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
                  {p.facilities.map((facility) => (
                    <div
                      key={facility}
                      className="flex min-w-0 items-center gap-2 rounded-xl bg-ink-50 px-3 py-2 text-[0.8125rem] text-ink-700 lg:gap-3 lg:rounded-[1rem] lg:px-4 lg:py-3 lg:text-sm"
                    >
                      <ShieldCheck className="size-4 shrink-0 text-brand-600" />
                      <span className="min-w-0">{facility}</span>
                    </div>
                  ))}
                </div>
              </DetailSection>
            )}

            <DetailSection
              title="Location"
              hint={p.address ?? `${p.area}, ${p.district}`}
              icon={MapPin}
              className="order-3"
            >
              <div className="mb-3 flex justify-end">
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-glass min-h-10 text-xs"
                >
                  <Navigation className="size-3.5" /> Get directions
                </a>
              </div>
              {mapEmbedUrl ? (
                <iframe
                  src={mapEmbedUrl}
                  title={`${p.title} location map`}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  className="h-52 w-full rounded-2xl border border-border bg-ink-50 lg:h-56 lg:rounded-[1.5rem]"
                />
              ) : (
                <div className="relative h-48 overflow-hidden rounded-2xl border border-border bg-brand-aurora lg:h-56 lg:rounded-[1.5rem]">
                  <div className="absolute inset-0 bg-grid-fade opacity-60" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                    <span className="flex size-11 items-center justify-center rounded-full bg-brand-600 text-white shadow-md">
                      <MapPin className="size-5" />
                    </span>
                    <p className="mt-3 text-sm font-semibold text-ink-900">
                      {p.area}, {p.district}
                    </p>
                    {p.address && (
                      <p className="mt-1 max-w-xs text-xs leading-relaxed text-ink-600">
                        {p.address}
                      </p>
                    )}
                    <p className="mt-0.5 text-xs text-ink-500">
                      {p.division} Division
                    </p>
                  </div>
                </div>
              )}
            </DetailSection>

            {similar.length > 0 && (
              <div className="order-last mt-2 lg:mt-0">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="hidden text-xs uppercase tracking-[0.18em] text-brand-700 sm:block">
                      More like this
                    </p>
                    <h2 className="font-heading text-lg font-bold tracking-tight sm:mt-2 sm:text-2xl md:text-3xl">
                      Similar Properties
                    </h2>
                  </div>
                  <Link href={ROUTES.PROPERTIES} className="btn-glass shrink-0">
                    Browse more
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2.5 sm:mt-5 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
                  {similar.map((s) => (
                    <div key={s.id} className="reveal min-w-0">
                      <PropertyCard property={s} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="contents lg:block lg:min-w-0 lg:space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="surface-card hidden bg-brand-aurora p-5 lg:block">
              <p className="text-xs uppercase tracking-[0.18em] text-brand-700">
                Price snapshot
              </p>
              <p className="mt-3 text-3xl font-semibold text-brand-700">
                {displayPrice}
              </p>
              <p className="mt-2 text-sm text-ink-500">
                {p.purpose === "rent"
                  ? "Monthly rent estimate."
                  : "Purchase-ready starting point."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 text-xs font-medium text-brand-800">
                  <Tag className="size-3" />
                  {p.priceNegotiable ? "Negotiable" : "Fixed price"}
                </span>
                {p.isVerified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 text-xs font-medium text-brand-800">
                    <ShieldCheck className="size-3" />
                    Verified listing
                  </span>
                )}
              </div>
            </div>

            <div className="surface-card order-12 min-w-0 p-4 lg:p-5">
              <h3 className="hidden font-sans text-lg font-semibold text-ink-900 lg:block">
                Contact Seller
              </h3>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500 lg:hidden">
                Listed by
              </p>
              <div className="mt-2 flex items-center gap-3 lg:mt-4">
                {p.sellerAvatar ? (
                  <Image
                    src={p.sellerAvatar}
                    alt={p.sellerName}
                    width={44}
                    height={44}
                    className="size-11 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                    {p.sellerName.charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink-900">
                    {p.sellerName}
                  </p>
                  <p className="inline-flex items-center gap-1 text-xs text-ink-500">
                    {p.sellerVerified ? (
                      <>
                        <ShieldCheck className="size-3 text-brand-600" />
                        Verified Seller
                      </>
                    ) : (
                      "Independent Seller"
                    )}
                  </p>
                </div>
              </div>
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-ink-50 px-3 py-1 text-xs text-ink-500">
                <Clock className="size-3.5 text-brand-500" />
                Typically replies within a few hours
              </p>

              {/* From md: call, WhatsApp and the inquiry form live here. Below md the action bar
                  (hidden from md) and its sheet carry the same three actions. */}
              <div className="mt-5 hidden space-y-2 md:block">
                <a
                  href={`tel:${p.sellerPhone}`}
                  className="flex w-full items-center gap-3 rounded-full bg-ink-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-ink-800"
                >
                  <Phone className="h-4 w-4" /> {p.sellerPhone}
                </a>
                {whatsappHref && (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center gap-3 rounded-full border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-800 transition-colors hover:bg-brand-100"
                  >
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </a>
                )}
              </div>

              <div className="mt-5 hidden border-t border-border pt-5 md:block">
                <p className="mb-3 text-sm font-semibold text-ink-900">
                  Send an inquiry
                </p>
                <SellerInquiryForm
                  propertyId={p.id}
                  propertyTitle={p.title}
                  sellerName={p.sellerName}
                />
              </div>

              <div className="mt-4 rounded-[1.25rem] border border-border bg-ink-50 p-4 lg:mt-5">
                <p className="text-sm leading-relaxed text-ink-600">
                  Need neutral help before talking to seller? Book consultation
                  with Alivia team.
                </p>
                <Link
                  href={ROUTES.CONSULTATION}
                  className="btn-glass mt-3 w-full lg:mt-4"
                >
                  Book Consultation
                </Link>
              </div>
            </div>

            {isSale && (
              <>
                <DetailSection
                  title="Make an offer"
                  hint={`Negotiate directly with ${p.sellerName}`}
                  icon={HandCoins}
                  className="order-13 lg:hidden"
                >
                  <OfferFlow
                    propertyId={p.id}
                    propertyTitle={p.title}
                    listingPrice={p.price}
                    sellerId={p.sellerId}
                    sellerName={p.sellerName}
                    embedded
                  />
                </DetailSection>
                <div className="hidden space-y-4 lg:block">
                  <OfferFlow
                    propertyId={p.id}
                    propertyTitle={p.title}
                    listingPrice={p.price}
                    sellerId={p.sellerId}
                    sellerName={p.sellerName}
                  />
                  <MortgageCalculator propertyPrice={p.price} />
                </div>
              </>
            )}

            <div className="order-14 min-w-0">
              <ReportListingDialog propertyId={p.id} />
            </div>
          </div>
        </div>
      </div>

      <PropertyActionBar
        propertyId={p.id}
        propertyTitle={p.title}
        sellerName={p.sellerName}
        sellerPhone={p.sellerPhone}
        whatsappHref={whatsappHref}
      />
    </>
  );
}

import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronRight, MapPin, ShieldCheck } from "lucide-react"

import { CardFact } from "@/components/common/card-fact"
import { GoldStar } from "@/components/marketplace/card-icons"
import { toCardProduct } from "@/components/marketplace/card-product"
import { MarketplaceBreadcrumb, type Crumb } from "@/components/marketplace/MarketplaceBreadcrumb"
import { MediaImage } from "@/components/marketplace/MediaImage"
import { BuyBox } from "@/components/marketplace/product/BuyBox"
import { ProductDetails } from "@/components/marketplace/product/ProductDetails"
import { ProductRail } from "@/components/marketplace/product/ProductRail"
import { RecentProductRecorder } from "@/components/marketplace/product/RecentProductRecorder"
import { RecentlyViewedRail } from "@/components/marketplace/product/RecentlyViewedRail"
import type { DetailSupplier } from "@/components/marketplace/product/types"
import { ProductGallery } from "@/components/marketplace/product-gallery"
import { telHref, visibleRating, whatsappHref } from "@/components/marketplace/product-meta"
import { supplierInitials } from "@/components/marketplace/supplier-media-utils"
import { ROUTES } from "@/config/routes.config"
import { ApiError, type Paginated } from "@/services/http-client"
import { marketplaceService, type ProductWithSupplier } from "@/services/marketplace.service"
import { isServiceKind } from "@/utils/marketplace-kind"

export const dynamic = "force-dynamic"

type PageProps = {
  params: Promise<{ slug: string }>
}

const RAIL_SIZE = 8
/**
 * The catalogue holds the same product under several ids (HATIL: 100 listings,
 * 43 distinct names), and a seller's products often sit in one category, so the
 * two lists overlap. Over-fetch so 8 distinct products survive de-duplication
 * in each rail (checked against HATIL beds: 25 / 40 still fill both).
 */
const SIMILAR_FETCH = 25
const SELLER_FETCH = 40

const noProducts: Paginated<ProductWithSupplier> = {
  data: [],
  meta: { page: 1, limit: SIMILAR_FETCH, total: 0, totalPages: 0 },
}

/** Same product listed twice differs only in id/slug, so compare by name. */
function nameKey(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ")
}

/** First `count` products not yet shown; marks them as shown. */
function takeUnique(items: ProductWithSupplier[], seen: Set<string>, count: number) {
  const picked: ProductWithSupplier[] = []
  for (const item of items) {
    if (picked.length === count) break
    const key = nameKey(item.name)
    if (seen.has(key)) continue
    seen.add(key)
    picked.push(item)
  }
  return picked
}

function metaDescription(product: ProductWithSupplier): string | undefined {
  const tagline = (product.supplier as DetailSupplier | undefined)?.tagline?.trim()
  const short = product.shortDescription?.trim()
  // Some sellers paste one shop-wide disclaimer into every product's short description.
  const text = short && short !== tagline ? short : product.description
  const clean = (text ?? "").replace(/\s+/g, " ").trim()
  if (!clean) return undefined
  return clean.length > 160 ? `${clean.slice(0, 157).trimEnd()}...` : clean
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  try {
    const product = await marketplaceService.productBySlug(slug)
    return {
      title: `${product.name} - Alivia Marketplace`,
      description: metaDescription(product),
    }
  } catch {
    return { title: "Product - Alivia Marketplace" }
  }
}

export default async function MarketplaceProductPage({ params }: PageProps) {
  const { slug } = await params

  let fetched: ProductWithSupplier
  try {
    fetched = await marketplaceService.productBySlug(slug)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound()
    throw err
  }

  // Sellers type brands with stray spaces ("HATIL "); clean it once for every section.
  const product: ProductWithSupplier = { ...fetched, brand: fetched.brand?.trim() || undefined }

  // The rails are extras: a failed or empty lookup just hides them, never the page.
  const [similarPage, sellerPage] = await Promise.all([
    marketplaceService
      .listProducts({ category: product.categorySlug, limit: SIMILAR_FETCH })
      .catch(() => noProducts),
    marketplaceService
      .listProducts({ supplierId: product.supplierId, limit: SELLER_FETCH })
      .catch(() => noProducts),
  ])
  // One "seen" set across the current product and both rails: no card repeats (by
  // name, which also covers the id) and each card's morph name stays unique.
  const seen = new Set([nameKey(product.name)])
  // The rail cards are client components: send each only the fields it reads.
  const similar = takeUnique(similarPage.data, seen, RAIL_SIZE).map(toCardProduct)
  const fromSeller = takeUnique(sellerPage.data, seen, RAIL_SIZE).map(toCardProduct)

  const supplier = product.supplier as DetailSupplier | undefined
  const serviceMode = isServiceKind(supplier?.kind)
  const supplierHref = supplier ? ROUTES.MARKETPLACE_SUPPLIER(supplier.slug) : null
  const quoteHref = `${ROUTES.MARKETPLACE_QUOTE}?productId=${encodeURIComponent(product.id)}&productSlug=${encodeURIComponent(product.slug)}${supplier ? `&supplierSlug=${encodeURIComponent(supplier.slug)}` : ""}`
  const call = telHref(supplier?.phone)
  const whatsapp = whatsappHref(supplier?.whatsApp)
  const rating = visibleRating(product.rating)

  // BuyBox is a client component, so everything passed in is serialised into the
  // page. It only reads price, unit, MOQ, lead time, stock, tiers and the
  // seller's id/slug/name; leave the long text and media out of the payload.
  const buyBoxProduct: ProductWithSupplier = {
    ...product,
    description: "",
    shortDescription: undefined,
    gallery: undefined,
    highlights: undefined,
    specs: undefined,
    documents: undefined,
    variants: undefined,
    category: undefined,
    supplier: supplier && {
      id: supplier.id,
      slug: supplier.slug,
      name: supplier.name,
      kind: supplier.kind,
    },
  }

  const categoryLabel =
    product.category?.name ??
    product.categorySlug.replace(/-/g, " ").replace(/^./, (letter) => letter.toUpperCase())
  const breadcrumbTrail: Crumb[] = [
    { label: categoryLabel, href: ROUTES.MARKETPLACE_CATEGORY(product.categorySlug) },
    { label: product.name },
  ]

  return (
    <main id="main-content" className="bg-white">
      <MarketplaceBreadcrumb trail={breadcrumbTrail} />
      <RecentProductRecorder
        product={{
          slug: product.slug,
          name: product.name,
          image: product.image,
          price: product.price,
          unit: product.unit,
          supplierName: supplier?.name,
        }}
      />

      {/* Phones: the gallery runs edge to edge (it applies its own negative margin). */}
      <section className="container-page pb-10 pt-0 sm:pt-6 lg:pb-14 lg:pt-8">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-x-12">
          <div className="min-w-0 lg:sticky lg:top-6 lg:self-start">
            <ProductGallery
              name={product.name}
              image={product.image}
              gallery={product.gallery ?? []}
              videoUrl={product.videoUrl}
              externalVideoUrl={product.externalVideoUrl}
              serviceMode={serviceMode}
              slug={product.slug}
            />
          </div>

          <div className="flex min-w-0 flex-col gap-4 lg:gap-5">
            <div>
              <h1 className="wrap-break-word text-balance font-heading text-xl font-semibold leading-tight text-ink-900 sm:text-2xl lg:text-3xl">
                {product.name}
              </h1>

              {/* The seller lives in the card below (phones) and the "Sold by" panel (desktop). */}
              {product.brand || rating || product.badge ? (
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.8125rem] text-ink-500">
                  {product.brand ? (
                    <span>
                      {serviceMode ? "Team" : "Brand"}{" "}
                      <span className="font-semibold text-ink-800">{product.brand}</span>
                    </span>
                  ) : null}
                  {rating ? (
                    <CardFact icon={GoldStar} className="text-[0.8125rem]">
                      <span className="font-bold text-ink-800">{rating.toFixed(1)}</span>
                      {product.reviewCount ? (
                        <span className="font-normal text-ink-500">({product.reviewCount} reviews)</span>
                      ) : null}
                    </CardFact>
                  ) : null}
                  {/* Seller-set label, shown once and quietly (it is on nearly every product). */}
                  {product.badge ? <span>{product.badge}</span> : null}
                </div>
              ) : null}
            </div>

            <BuyBox
              product={buyBoxProduct}
              serviceMode={serviceMode}
              quoteHref={quoteHref}
              call={call}
              whatsapp={whatsapp}
            />

            {/* Phones and tablets only: from lg the "Sold by" panel in ProductDetails covers it. */}
            {supplier && supplierHref ? (
              <Link
                href={supplierHref}
                className="flex min-h-16 items-center gap-3 rounded-2xl border border-border/70 bg-white p-3 lg:hidden transition-[scale,background-color,border-color] duration-140 ease-(--ease-out) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 active:scale-[0.98] motion-reduce:transition-colors motion-reduce:active:scale-100 [@media(hover:hover)_and_(pointer:fine)]:hover:border-brand-200 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-brand-50/50"
              >
                <span className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-50 font-heading text-sm font-semibold text-brand-700">
                  <MediaImage
                    src={supplier.logo}
                    alt=""
                    fill
                    sizes="44px"
                    className="object-contain p-1"
                    fallback={supplierInitials(supplier.name)}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs text-ink-500">
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
          </div>
        </div>

        <div className="mt-8 grid gap-10 sm:mt-10 lg:mt-14 lg:gap-14">
          <ProductDetails product={product} supplier={supplier} serviceMode={serviceMode} />
          {/* Only the hero morphs: rail cards whose slugs were on the previous page would pair with old photos. */}
          <ProductRail
            title={serviceMode ? "Similar services" : "Similar products"}
            href={ROUTES.MARKETPLACE_CATEGORY(product.categorySlug)}
            products={similar}
            morph={false}
          />
          {supplier && supplierHref ? (
            <ProductRail
              title={`More from ${supplier.name}`}
              href={supplierHref}
              products={fromSeller}
              morph={false}
            />
          ) : null}
          <RecentlyViewedRail excludeSlug={product.slug} />
        </div>
      </section>
    </main>
  )
}

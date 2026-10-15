import type { Metadata } from "next"
import Link from "next/link"
import { ChevronRight, ShieldCheck, Sparkles, Timer } from "lucide-react"

import { GetQuoteForm } from "@/components/marketplace/GetQuoteForm"
import { marketplaceService } from "@/services/marketplace.service"
import { ROUTES } from "@/config/routes.config"
import { siteConfig } from "@/config/site.config"

export const metadata: Metadata = {
  title: "Get a Quote - Alivia Marketplace",
  description:
    "Request a quote from verified suppliers and service providers in Bangladesh. Free, fast, no obligation.",
}

export const dynamic = "force-dynamic"

type Props = {
  searchParams: Promise<{
    supplierId?: string
    supplierSlug?: string
    productId?: string
    productSlug?: string
    variantId?: string
    categorySlug?: string
    /** Prefill from the product page's quantity stepper (a repeated param arrives as an array). */
    qty?: string | string[]
    unit?: string | string[]
  }>
}

/** Same ceiling as the quote list's stepper; anything larger is not a real order. */
const MAX_PREFILL_QTY = 999_999

/** First value of a search param that may be repeated (`?unit=a&unit=b`). */
function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value
}

export default async function MarketplaceQuotePage({ searchParams }: Props) {
  const params = await searchParams

  // Quantity/unit prefill: only a positive number up to MAX_PREFILL_QTY and a
  // short unit (the form's own limit is 32 characters); anything else leaves
  // the fields empty.
  const qtyParam = Number(firstParam(params.qty))
  const quantity =
    Number.isFinite(qtyParam) && qtyParam > 0 && qtyParam <= MAX_PREFILL_QTY ? qtyParam : undefined
  const unit = firstParam(params.unit)?.trim().slice(0, 32) || undefined

  // Best-effort resolution of names from slugs (so the form shows context).
  // Failures (e.g. backend not reachable) are silently ignored: the form
  // still works using the raw id/slug values.
  let supplierName: string | undefined
  let supplierId = params.supplierId
  let productName: string | undefined
  let productId = params.productId
  let variantName: string | undefined
  let variants
  let categoryName: string | undefined
  let categoryVariants
  let categoryAttributes

  if (params.supplierSlug) {
    try {
      const supplier = await marketplaceService.supplierBySlug(params.supplierSlug)
      supplierName = supplier.name
      supplierId ??= supplier.id
    } catch {
      /* ignore: context just stays unresolved */
    }
  }

  if (params.productSlug) {
    try {
      const product = await marketplaceService.productBySlug(params.productSlug)
      productName = product.name
      productId ??= product.id
      variants = product.variants
      variantName = product.variants?.find((variant) => variant.id === params.variantId)?.name
      supplierName ??= product.supplier?.name
      supplierId ??= product.supplier?.id
    } catch {
      /* ignore */
    }
  }

  if (params.productId && !variants) {
    try {
      const products = await marketplaceService.listProducts({ limit: 100 })
      const product = products.data.find((item) => item.id === params.productId)
      productName = product?.name ?? productName
      variants = product?.variants
      variantName = product?.variants?.find((variant) => variant.id === params.variantId)?.name
      supplierName ??= product?.supplier?.name
      supplierId ??= product?.supplier?.id
    } catch {
      /* ignore */
    }
  }

  if (params.categorySlug) {
    try {
      const categories = await marketplaceService.listCategories()
      const category = categories.find((c) => c.slug === params.categorySlug)
      categoryName = category?.name
      categoryVariants = category?.variants
      categoryAttributes = category?.attributes
      // When a specific product variant wasn't resolved, fall back to the
      // category's configured variant for the "Requesting from" label.
      if (!variantName && params.variantId) {
        variantName = category?.variants?.find((v) => v.id === params.variantId)?.name
      }
    } catch {
      /* ignore */
    }
  }

  // Back from the first screen returns to where the visitor came from.
  const exitHref = params.productSlug
    ? ROUTES.MARKETPLACE_PRODUCT(params.productSlug)
    : params.supplierSlug
      ? ROUTES.MARKETPLACE_SUPPLIER(params.supplierSlug)
      : params.categorySlug
        ? ROUTES.MARKETPLACE_CATEGORY(params.categorySlug)
        : ROUTES.MARKETPLACE

  const heading = productName
    ? `Book For Consultations for ${productName}`
    : supplierName
      ? `Book ${supplierName} For Consultations`
      : categoryName
        ? `Book For Consultations: ${categoryName}`
        : "Book For Consultations"

  return (
    <main id="main-content" className="bg-linear-to-b from-brand-50/60 via-white to-white">
      <div className="container-page py-3 md:py-10">
        <nav
          aria-label="Breadcrumb"
          className="mb-5 hidden items-center gap-2 text-sm text-ink-600 md:flex"
        >
          <Link
            href={ROUTES.MARKETPLACE}
            className="inline-flex min-h-9 items-center rounded-full pr-2 hover:text-brand-700"
          >
            Marketplace
          </Link>
          <ChevronRight aria-hidden="true" className="size-3.5 text-ink-400" />
          <span className="text-ink-900">Get a Quote</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-start">
          {/* Phones: the guided flow is the page (no card, no big heading).
              From md: the classic card with the whole form. */}
          <section className="md:rounded-[2rem] md:border md:border-border/70 md:bg-white md:p-7 md:shadow-(--shadow-card)">
            <header className="mb-5 hidden border-b border-border/60 pb-5 md:block">
              <h1 className="font-heading text-2xl font-semibold text-balance text-ink-900 sm:text-3xl">
                {heading}
              </h1>
              <p className="mt-2 text-sm text-ink-600">
                Share what you&apos;re looking for. We&apos;ll route your request to verified
                suppliers and notify you when they reply.
              </p>
            </header>
            <h1 className="sr-only md:hidden">{heading}</h1>

            <GetQuoteForm
              guided="phones"
              exitHref={exitHref}
              context={{
                supplierId,
                supplierName,
                productId,
                productName,
                variantId: params.variantId,
                variantName,
                variants,
                categorySlug: params.categorySlug,
                categoryName,
                categoryVariants,
                categoryAttributes,
                quantity,
                unit,
              }}
              redirectOnSuccess
            />
          </section>

          <aside className="hidden space-y-4 md:block lg:sticky lg:top-24">
            <div className="mobile-liquid-glass rounded-[2rem] border border-border/70 bg-white p-5 shadow-(--shadow-card)">
              <h2 className="font-heading text-lg font-semibold text-ink-900">
                Verified suppliers. Trackable conversations.
              </h2>
              <ul className="mt-4 space-y-3 text-sm text-ink-700">
                <li className="flex items-start gap-3">
                  <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 text-brand-700" />
                  <div>
                    <p className="font-medium text-ink-900">Verified businesses only</p>
                    <p className="text-xs text-ink-600">
                      Trade licenses and certifications confirmed before listing.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Timer aria-hidden="true" className="mt-0.5 size-5 text-brand-700" />
                  <div>
                    <p className="font-medium text-ink-900">Typical response: 24 hours</p>
                    <p className="text-xs text-ink-600">
                      Most suppliers reply within a business day during working hours.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Sparkles aria-hidden="true" className="mt-0.5 size-5 text-gold-700" />
                  <div>
                    <p className="font-medium text-ink-900">Free, no obligation</p>
                    <p className="text-xs text-ink-600">
                      Compare quotes from multiple suppliers with no commitment required.
                    </p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="mobile-liquid-glass rounded-[2rem] border border-border/70 bg-brand-50/60 p-5">
              <h3 className="font-heading text-base font-semibold text-ink-900">
                Talk to our marketplace team
              </h3>
              <p className="mt-1 text-sm text-ink-700">
                Not sure who to ask? Submit the form and we&apos;ll route it for you.
              </p>
              <p className="mt-3 text-xs text-ink-600">
                Or call <span className="font-medium text-ink-900">{siteConfig.contact.phone}</span>
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}

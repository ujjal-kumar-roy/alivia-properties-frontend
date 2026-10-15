import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  Phone,
  Sparkles,
  Truck,
} from "lucide-react";

import { MobileActionBar } from "@/components/common/mobile-action-bar";
import {
  listingHref,
  parseKind,
  parseSort,
  parseView,
  sortToApi,
  type KindKey,
  type ListingView,
  type SortKey,
} from "@/components/marketplace/category-filters";
import { CategoryFilters } from "@/components/marketplace/CategoryFilters";
import { CategoryImageCard } from "@/components/marketplace/CategoryImageCard";
import { ChipRail } from "@/components/marketplace/ChipRail";
import {
  MarketplaceBreadcrumb,
  type Crumb,
} from "@/components/marketplace/MarketplaceBreadcrumb";
import { MarketplaceProductCard } from "@/components/marketplace/MarketplaceProductCard";
import { MarketplaceSupplierSummaryCard } from "@/components/marketplace/MarketplaceSupplierSummaryCard";
import { MediaImage } from "@/components/marketplace/MediaImage";
import { telHref } from "@/components/marketplace/product-meta";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/routes.config";
import { siteConfig } from "@/config/site.config";
import {
  marketplaceService,
  type MarketplaceCategory,
  type ProductWithSupplier,
  type TreeDepartment,
} from "@/services/marketplace.service";
import type { Paginated } from "@/services/http-client";
import type { Supplier } from "@/types/marketplace.types";

export const dynamic = "force-dynamic";

const CATEGORY_FALLBACK_IMAGE = "/marketplace-reference/cat-materials.png";
const PAGE_SIZE = 12;

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    page?: string;
    view?: string;
    sort?: string;
    kind?: string;
  }>;
};

type Found = {
  node: MarketplaceCategory;
  dept?: MarketplaceCategory;
  level: "DEPARTMENT" | "CATEGORY";
  children: MarketplaceCategory[];
  siblings: MarketplaceCategory[];
};

function findNode(tree: TreeDepartment[], slug: string): Found | null {
  for (const dept of tree) {
    if (dept.slug === slug)
      return {
        node: dept,
        level: "DEPARTMENT",
        children: dept.categories,
        siblings: tree,
      };
    for (const cat of dept.categories) {
      if (cat.slug === slug)
        return {
          node: cat,
          dept,
          level: "CATEGORY",
          children: [],
          siblings: dept.categories,
        };
    }
  }
  return null;
}

function emptyPage<T>(page: number): Paginated<T> {
  return {
    data: [],
    meta: { page, limit: PAGE_SIZE, total: 0, totalPages: 0 },
  };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const tree = await marketplaceService.getTree();
    const found = findNode(tree, slug);
    return {
      title: found
        ? `${found.node.name} - Alivia Marketplace`
        : "Marketplace - Alivia Properties",
      description: found?.node.description ?? undefined,
    };
  } catch {
    return { title: "Marketplace - Alivia Properties" };
  }
}

export default async function MarketplaceCategoryPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const requestedPage = Number.parseInt(sp.page ?? "1", 10);
  const page =
    Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  let tree: TreeDepartment[] = [];
  try {
    tree = await marketplaceService.getTree();
  } catch {
    /* fall through to notFound */
  }

  const found = findNode(tree, slug);
  if (tree.length > 0 && !found) notFound();
  if (!found) {
    // Backend unreachable: show a minimal shell linking to the wizard.
    return (
      <main id="main-content" className="bg-white">
        <div className="container-page py-8 text-center sm:py-12">
          <p className="text-sm text-ink-600">Loading marketplace...</p>
          <Button
            render={<Link href={ROUTES.MARKETPLACE_REQUEST} />}
            className="mt-4"
          >
            Request a quote
          </Button>
        </div>
      </main>
    );
  }

  const { node, dept, level, children, siblings } = found;
  const isCategory = level === "CATEGORY";
  const basePath = ROUTES.MARKETPLACE_CATEGORY(node.slug);

  // Quote link prefills the wizard at the right depth.
  const quoteHref = isCategory
    ? `${ROUTES.MARKETPLACE_REQUEST}?dept=${dept?.slug ?? ""}&cat=${node.slug}`
    : `${ROUTES.MARKETPLACE_REQUEST}?dept=${node.slug}`;
  const desk = telHref(siteConfig.contact.phoneRaw);

  // Live product counts for the category tiles (the tree does not carry them).
  const counts = new Map<string, number>();
  const allCategories = await marketplaceService
    .listCategories()
    .catch(() => [] as MarketplaceCategory[]);
  for (const category of allCategories) {
    counts.set(category.slug, category.productCount ?? 0);
  }

  // ── Listing data (leaf categories only) ─────────────────────────────────────
  const kind: KindKey = parseKind(sp.kind);
  const kindParam = kind === "all" ? undefined : kind;
  let productPage: Paginated<ProductWithSupplier> = emptyPage(1);
  let supplierPage: Paginated<Supplier> = emptyPage(1);
  let view: ListingView = "products";

  if (isCategory) {
    const loadProducts = (p: number) =>
      marketplaceService
        .listProducts({
          category: node.slug,
          page: p,
          limit: PAGE_SIZE,
          kind: kindParam,
          sort: sortToApi(parseSort(sp.sort, "products")),
        })
        .catch(() => emptyPage<ProductWithSupplier>(p));
    const loadSuppliers = (p: number) =>
      marketplaceService
        .listSuppliers({
          category: node.slug,
          page: p,
          limit: PAGE_SIZE,
          kind: kindParam,
          sort: sortToApi(parseSort(sp.sort, "suppliers")),
        })
        .catch(() => emptyPage<Supplier>(p));

    [productPage, supplierPage] = await Promise.all([
      loadProducts(1),
      loadSuppliers(1),
    ]);
    view =
      parseView(sp.view) ??
      (productPage.meta.total === 0 && supplierPage.meta.total > 0
        ? "suppliers"
        : "products");

    if (page > 1) {
      if (view === "products") {
        const target = Math.min(page, Math.max(1, productPage.meta.totalPages));
        if (target > 1) productPage = await loadProducts(target);
      } else {
        const target = Math.min(page, Math.max(1, supplierPage.meta.totalPages));
        if (target > 1) supplierPage = await loadSuppliers(target);
      }
    }
  }

  const sort: SortKey = parseSort(sp.sort, view);
  const activeMeta =
    view === "products" ? productPage.meta : supplierPage.meta;
  const activeCount =
    view === "products" ? productPage.data.length : supplierPage.data.length;
  const related = siblings
    .filter((category) => category.slug !== node.slug)
    .slice(0, activeCount === 0 ? 8 : 6);

  const heroImage = node.image?.url ?? node.iconUrl ?? CATEGORY_FALLBACK_IMAGE;
  const categoryDescription =
    node.description ??
    "Compare available options, then send the marketplace desk the details needed for a quote.";
  const confidenceItems = [
    {
      icon: CheckCircle2,
      label: "Verified matching",
      text: "Share your requirements once so the desk can review them against this category.",
    },
    {
      icon: Clock3,
      label: "24-hour response target",
      text: "The marketplace desk aims to route a complete request within one business day.",
    },
    {
      icon: Truck,
      label: "Delivery-aware sourcing",
      text: "Include your delivery area and timing to make your request easier to assess.",
    },
  ];

  const breadcrumbTrail: Crumb[] = [
    ...(dept
      ? [{ label: dept.name, href: ROUTES.MARKETPLACE_CATEGORY(dept.slug) }]
      : []),
    { label: node.name },
  ];

  const statChips = isCategory
    ? [
        `${productPage.meta.total} ${productPage.meta.total === 1 ? "product" : "products"}`,
        `${supplierPage.meta.total} ${supplierPage.meta.total === 1 ? "supplier" : "suppliers"}`,
      ]
    : [`${children.length} ${children.length === 1 ? "category" : "categories"}`];

  const tabHref = (next: ListingView) =>
    listingHref(basePath, { view: next, sort: parseSort(sp.sort, next), kind });

  return (
    <main id="main-content" className="bg-white">
      <MarketplaceBreadcrumb trail={breadcrumbTrail} />

      <section className="relative overflow-hidden border-b border-border/60 bg-linear-to-r from-brand-950 via-brand-900 to-brand-700 text-white">
        <div className="container-page relative py-4 sm:py-10 lg:py-14">
          <div className="grid items-center gap-3 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.72fr)] lg:gap-12">
            <div className="flex min-w-0 items-start gap-3 sm:block">
              {/* Phones: a small thumbnail beside the title instead of the large photo. */}
              <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-white/20 bg-brand-900/40 sm:hidden">
                <MediaImage
                  src={heroImage}
                  alt=""
                  fill
                  unoptimized
                  sizes="64px"
                  className="object-cover"
                  fallback={null}
                />
              </div>
              <div className="enter-cascade min-w-0">
                <p className="text-eyebrow hidden text-gold-200 sm:block">
                  Marketplace procurement desk
                </p>
                <h1 className="wrap-break-word text-balance font-heading text-xl font-semibold leading-tight sm:mt-2 sm:text-4xl">
                  {node.name}
                </h1>
                <p className="mt-1 line-clamp-2 max-w-2xl text-[0.8125rem] leading-snug text-brand-100 sm:mt-3 sm:line-clamp-none sm:text-base sm:leading-relaxed">
                  {categoryDescription}
                </p>
              </div>
            </div>

            <div className="hidden flex-wrap gap-2 md:flex lg:col-start-1">
              <Button
                render={<Link href={quoteHref} />}
                size="lg"
                className="gap-2 bg-gold-400 text-ink-900 hover:bg-gold-300"
              >
                <FileText aria-hidden="true" className="size-4" /> Request a
                quote
              </Button>
              <Button
                render={<a href={`tel:${siteConfig.contact.phoneRaw}`} />}
                size="lg"
                variant="outline"
                className="gap-2 border-white/30 bg-white/10 text-white hover:bg-white/20"
              >
                <Phone aria-hidden="true" className="size-4" /> Call the desk
              </Button>
            </div>

            <div className="relative hidden aspect-4/3 overflow-hidden rounded-3xl border border-white/20 bg-brand-900/40 shadow-(--shadow-elevated) lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:block">
              <MediaImage
                src={heroImage}
                alt={node.image?.alt ?? `${node.name} construction supplies`}
                fill
                unoptimized
                priority
                sizes="(max-width: 1024px) 100vw, 42vw"
                className="object-cover"
                fallback={null}
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-linear-to-t from-brand-950/55 via-transparent to-transparent"
              />
            </div>
          </div>

          <ul className="mt-3 flex flex-wrap gap-1.5 sm:hidden">
            {statChips.map((chip) => (
              <li
                key={chip}
                className="rounded-full bg-white/12 px-2.5 py-1 text-xs font-semibold tabular-nums text-brand-50 ring-1 ring-white/15"
              >
                {chip}
              </li>
            ))}
          </ul>

          <ul className="mt-8 hidden gap-3 sm:grid sm:grid-cols-3">
            {confidenceItems.map(({ icon: Icon, label, text }) => (
              <li
                key={label}
                className="rounded-2xl border border-white/12 bg-white/10 p-4 backdrop-blur-sm"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Icon aria-hidden="true" className="size-4 text-gold-300" />
                  {label}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-brand-100">
                  {text}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container-page pb-6 pt-3 sm:py-10 lg:py-12">
        {/* One scrollable chip row: sibling categories (or all departments). */}
        <ChipRail
          label={isCategory ? `Categories in ${dept?.name ?? "marketplace"}` : "Departments"}
        >
          {siblings.map((chip) => (
            <Link
              key={chip.slug}
              href={ROUTES.MARKETPLACE_CATEGORY(chip.slug)}
              aria-current={chip.slug === node.slug ? "page" : undefined}
              className="glass-chip"
            >
              {chip.name}
            </Link>
          ))}
        </ChipRail>

        {/* ── Department: show its categories as tiles ───────────────────── */}
        {!isCategory && (
          <>
            <header className="mt-4 sm:mt-8">
              <p className="text-eyebrow mb-1 hidden sm:block">
                Compare supply categories
              </p>
              <h2 className="font-heading text-lg font-semibold text-ink-900 sm:text-3xl">
                Choose a category to prepare your request
              </h2>
              <p className="mt-2 hidden max-w-2xl text-sm text-ink-600 sm:block">
                Open a category to compare the listings available and add the
                details needed for a useful quote.
              </p>
            </header>
            {children.length > 0 ? (
              <ul className="reveal-stagger mt-3 grid grid-cols-2 gap-2.5 sm:mt-5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                {children.map((child) => (
                  <li key={child.slug} className="min-w-0">
                    <CategoryImageCard
                      cat={child}
                      count={counts.get(child.slug)}
                      className="h-full"
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyOnboarding name={node.name} quoteHref={quoteHref} />
            )}
          </>
        )}

        {/* ── Category: products and suppliers ───────────────────────────── */}
        {isCategory && (
          <>
            <div className="mt-2.5 flex items-center gap-2 sm:mt-5">
              <nav
                aria-label="Listing type"
                className="flex min-w-0 flex-1 gap-1.5 sm:flex-none"
              >
                <Link
                  href={tabHref("products")}
                  aria-current={view === "products" ? "page" : undefined}
                  className="glass-chip min-w-0 flex-1 gap-1.5 sm:flex-none sm:px-5"
                >
                  Products
                  <span className="tabular-nums opacity-80">
                    {productPage.meta.total}
                  </span>
                </Link>
                <Link
                  href={tabHref("suppliers")}
                  aria-current={view === "suppliers" ? "page" : undefined}
                  className="glass-chip min-w-0 flex-1 gap-1.5 sm:flex-none sm:px-5"
                >
                  Suppliers
                  <span className="tabular-nums opacity-80">
                    {supplierPage.meta.total}
                  </span>
                </Link>
              </nav>
              <CategoryFilters
                basePath={basePath}
                view={view}
                sort={sort}
                kind={kind}
              />
            </div>

            <h2 className="sr-only">
              {view === "products" ? "Products" : "Suppliers"} in {node.name}
            </h2>

            {activeCount > 0 ? (
              <>
                {view === "products" ? (
                  <ul className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                    {productPage.data.map((product) => (
                      <li key={product.id} className="reveal min-w-0">
                        <MarketplaceProductCard
                          product={product}
                          className="h-full"
                        />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ul className="mt-3 grid gap-2.5 sm:gap-4">
                    {supplierPage.data.map((supplier) => (
                      <li key={supplier.id} className="reveal min-w-0">
                        <MarketplaceSupplierSummaryCard
                          supplier={supplier}
                          categorySlug={node.slug}
                        />
                      </li>
                    ))}
                  </ul>
                )}

                {activeMeta.totalPages > 1 && (
                  <nav
                    aria-label={`${view === "products" ? "Product" : "Supplier"} listing pages`}
                    className="mt-4 flex items-center justify-between gap-3"
                  >
                    {activeMeta.page > 1 ? (
                      <Link
                        href={listingHref(basePath, {
                          view,
                          sort,
                          kind,
                          page: activeMeta.page - 1,
                        })}
                        className="btn-glass gap-1"
                      >
                        <ChevronLeft aria-hidden="true" className="size-4" />
                        Previous
                      </Link>
                    ) : (
                      <span />
                    )}
                    <p className="text-xs font-semibold tabular-nums text-ink-600">
                      Page {activeMeta.page} of {activeMeta.totalPages}
                    </p>
                    {activeMeta.page < activeMeta.totalPages ? (
                      <Link
                        href={listingHref(basePath, {
                          view,
                          sort,
                          kind,
                          page: activeMeta.page + 1,
                        })}
                        className="btn-glass gap-1"
                      >
                        Next
                        <ChevronRight aria-hidden="true" className="size-4" />
                      </Link>
                    ) : (
                      <span />
                    )}
                  </nav>
                )}
              </>
            ) : (
              <EmptyOnboarding
                name={node.name}
                quoteHref={quoteHref}
                filtered={kind !== "all"}
                resetHref={basePath}
              />
            )}

            {related.length > 0 && (
              <section className="mt-6 sm:mt-10" aria-labelledby="related-heading">
                <h2
                  id="related-heading"
                  className="font-heading text-lg font-semibold text-ink-900 sm:text-2xl"
                >
                  More in {dept?.name ?? "the marketplace"}
                </h2>
                <ul className="reveal-stagger mt-2.5 grid grid-cols-2 gap-2.5 sm:mt-4 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                  {related.map((category) => (
                    <li key={category.slug} className="min-w-0">
                      <CategoryImageCard
                        cat={category}
                        count={counts.get(category.slug)}
                        className="h-full"
                      />
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </section>

      <MobileActionBar label="Request a quote">
        <Link href={quoteHref} className="btn-tactile flex-1">
          <FileText aria-hidden="true" className="size-4" />
          Request a quote
        </Link>
        {desk ? (
          <a
            href={desk}
            aria-label="Call the marketplace desk"
            className="btn-glass size-11 shrink-0 !p-0"
          >
            <Phone aria-hidden="true" className="size-4" />
          </a>
        ) : null}
      </MobileActionBar>
    </main>
  );
}

function EmptyOnboarding({
  name,
  quoteHref,
  filtered = false,
  resetHref,
}: {
  name: string;
  quoteHref: string;
  filtered?: boolean;
  resetHref?: string;
}) {
  return (
    <div className="mt-3 rounded-2xl border border-border/70 bg-white p-5 text-center shadow-(--shadow-card) sm:mt-5 sm:p-8">
      <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 sm:size-12">
        <Sparkles aria-hidden="true" className="size-5" />
      </span>
      <p className="mt-2 font-heading text-lg font-semibold text-ink-900">
        {filtered ? "No matches for this filter" : "We are onboarding partners"}
      </p>
      <p className="mt-1 text-sm text-ink-600">
        {filtered
          ? `Nothing under ${name} matches the seller type you chose.`
          : `Nothing is listed under ${name} yet. Send the marketplace desk your requirements to start a quote request.`}
      </p>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {filtered && resetHref ? (
          <Link href={resetHref} className="btn-glass">
            Clear filters
          </Link>
        ) : null}
        <Link href={quoteHref} className="btn-tactile btn-tactile--sm">
          <FileText aria-hidden="true" className="size-3.5" /> Request a quote
        </Link>
      </div>
    </div>
  );
}

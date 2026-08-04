import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CheckCircle2,
  Clock3,
  FileText,
  Phone,
  Sparkles,
  Truck,
} from "lucide-react";

import {
  MarketplaceBreadcrumb,
  type Crumb,
} from "@/components/marketplace/MarketplaceBreadcrumb";
import { MarketplaceSupplierSummaryCard } from "@/components/marketplace/MarketplaceSupplierSummaryCard";
import { Button } from "@/components/ui/button";
import { CategoryImageCard } from "@/components/marketplace/CategoryImageCard";
import { ROUTES } from "@/config/routes.config";
import { siteConfig } from "@/config/site.config";
import {
  marketplaceService,
  type MarketplaceCategory,
  type TreeDepartment,
} from "@/services/marketplace.service";

export const dynamic = "force-dynamic";

const CATEGORY_FALLBACK_IMAGE = "/marketplace-reference/cat-materials.png";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

type Found = {
  node: MarketplaceCategory;
  dept?: MarketplaceCategory;
  level: "DEPARTMENT" | "CATEGORY";
  children: MarketplaceCategory[];
};

function findNode(tree: TreeDepartment[], slug: string): Found | null {
  for (const dept of tree) {
    if (dept.slug === slug)
      return { node: dept, level: "DEPARTMENT", children: dept.categories };
    for (const cat of dept.categories) {
      if (cat.slug === slug)
        return { node: cat, dept, level: "CATEGORY", children: [] };
    }
  }
  return null;
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
        ? `${found.node.name} — Alivia Marketplace`
        : "Marketplace — Alivia Properties",
      description: found?.node.description ?? undefined,
    };
  } catch {
    return { title: "Marketplace — Alivia Properties" };
  }
}

export default async function MarketplaceCategoryPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const requestedPage = Number.parseInt((await searchParams).page ?? "1", 10);
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
    // Backend unreachable — show a minimal shell linking to the wizard.
    return (
      <main id="main-content" className="bg-white">
        <div className="container-page section-y-sm text-center">
          <p className="text-sm text-ink-600">Loading marketplace…</p>
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

  const { node, dept, level, children } = found;
  const isCategory = level === "CATEGORY";

  // Quote link prefills the wizard at the right depth.
  const quoteHref = isCategory
    ? `${ROUTES.MARKETPLACE_REQUEST}?dept=${dept?.slug ?? ""}&cat=${node.slug}`
    : `${ROUTES.MARKETPLACE_REQUEST}?dept=${node.slug}`;

  let supplierPage = isCategory
    ? await marketplaceService
        .listSuppliers({ category: node.slug, page, limit: 3 })
        .catch(() => ({
          data: [],
          meta: { page, limit: 3, total: 0, totalPages: 0 },
        }))
    : { data: [], meta: { page: 1, limit: 3, total: 0, totalPages: 0 } };

  if (
    isCategory &&
    supplierPage.meta.totalPages > 0 &&
    page > supplierPage.meta.totalPages
  ) {
    supplierPage = await marketplaceService
      .listSuppliers({
        category: node.slug,
        page: supplierPage.meta.totalPages,
        limit: 3,
      })
      .catch(() => supplierPage);
  }

  const { data: suppliers, meta: supplierMeta } = supplierPage;
  const supplierRangeStart =
    suppliers.length > 0 ? (supplierMeta.page - 1) * supplierMeta.limit + 1 : 0;
  const supplierRangeEnd = Math.min(
    supplierRangeStart + suppliers.length - 1,
    supplierMeta.total,
  );

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

  return (
    <main id="main-content" className="bg-white">
      <section className="relative overflow-hidden border-b border-border/60 bg-linear-to-r from-brand-950 via-brand-900 to-brand-700 text-white">
        <div className="container-page relative py-10 sm:py-14">
          <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.72fr)] lg:gap-12">
            <div>
              <p className="text-eyebrow text-gold-200">
                Marketplace procurement desk
              </p>
              <h1 className="mt-2 wrap-break-word text-balance font-heading text-3xl font-semibold sm:text-4xl">
                {node.name}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-brand-100 sm:text-base">
                {categoryDescription}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
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
            </div>

            <div className="relative aspect-4/3 overflow-hidden rounded-3xl border border-white/20 bg-brand-900/40 shadow-(--shadow-elevated)">
              <Image
                src={node.image?.url ?? CATEGORY_FALLBACK_IMAGE}
                alt={node.image?.alt ?? `${node.name} construction supplies`}
                fill
                unoptimized
                priority
                sizes="(max-width: 1024px) 100vw, 42vw"
                className="object-cover"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-linear-to-t from-brand-950/55 via-transparent to-transparent"
              />
            </div>
          </div>

          <ul className="mt-8 grid gap-3 sm:grid-cols-3">
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

      <MarketplaceBreadcrumb trail={breadcrumbTrail} />

      <section className="container-page py-10 sm:py-14">
        {/* ── Department: show its categories as tiles ───────────────────── */}
        {!isCategory && (
          <>
            <header className="mb-4">
              <p className="text-eyebrow mb-1">Compare supply categories</p>
              <h2 className="font-heading text-2xl font-semibold text-ink-900 sm:text-3xl">
                Choose a category to prepare your request
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-ink-600">
                Open a category to compare the listings available and add the
                details needed for a useful quote.
              </p>
            </header>
            {children.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {children.map((child) => (
                  <CategoryImageCard key={child.slug} cat={child} />
                ))}
              </div>
            ) : (
              <EmptyOnboarding name={node.name} quoteHref={quoteHref} />
            )}
          </>
        )}

        {/* ── Category: show suppliers directly ──────────────────────────── */}
        {isCategory && (
          <>
            <header className="mb-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-eyebrow mb-1">
                  Compare options before requesting a quote
                </p>
                <h2 className="font-heading text-2xl font-semibold text-ink-900 sm:text-3xl">
                  {suppliers.length > 0
                    ? `${supplierMeta.total} supplier listings`
                    : "Supplier listings are being added"}
                </h2>
                {suppliers.length > 0 && (
                  <p className="mt-1 max-w-2xl text-sm text-ink-600">
                    Showing {supplierRangeStart}–{supplierRangeEnd} of{" "}
                    {supplierMeta.total} listings · Page {supplierMeta.page} of{" "}
                    {supplierMeta.totalPages}
                  </p>
                )}
              </div>
              <Button
                render={<Link href={quoteHref} />}
                size="sm"
                className="gap-1.5"
              >
                <FileText aria-hidden="true" className="size-3.5" /> Request a
                quote
              </Button>
            </header>

            {suppliers.length > 0 ? (
              <>
                <ul className="grid gap-4">
                  {suppliers.map((supplier) => (
                    <li key={supplier.id}>
                      <MarketplaceSupplierSummaryCard
                        supplier={supplier}
                        categorySlug={node.slug}
                      />
                    </li>
                  ))}
                </ul>

                {supplierMeta.totalPages > 1 && (
                  <nav
                    aria-label="Supplier listings pages"
                    className="mt-6 flex items-center justify-between gap-3"
                  >
                    {supplierMeta.page > 1 ? (
                      <Button
                        render={
                          <Link
                            href={`${ROUTES.MARKETPLACE_CATEGORY(node.slug)}?page=${supplierMeta.page - 1}`}
                          />
                        }
                        variant="outline"
                      >
                        Previous
                      </Button>
                    ) : (
                      <span />
                    )}
                    {supplierMeta.page < supplierMeta.totalPages ? (
                      <Button
                        render={
                          <Link
                            href={`${ROUTES.MARKETPLACE_CATEGORY(node.slug)}?page=${supplierMeta.page + 1}`}
                          />
                        }
                        variant="outline"
                      >
                        Next
                      </Button>
                    ) : (
                      <span />
                    )}
                  </nav>
                )}
              </>
            ) : (
              <EmptyOnboarding name={node.name} quoteHref={quoteHref} />
            )}
          </>
        )}
      </section>
    </main>
  );
}

function EmptyOnboarding({
  name,
  quoteHref,
}: {
  name: string;
  quoteHref: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-white p-8 text-center shadow-(--shadow-card)">
      <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
        <Sparkles aria-hidden="true" className="size-5" />
      </span>
      <p className="mt-3 font-heading text-lg font-semibold text-ink-900">
        We&apos;re onboarding partners
      </p>
      <p className="mt-1 text-sm text-ink-600">
        Nothing is listed under {name} yet. Send the marketplace desk your
        requirements to start a quote request.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Button
          render={<Link href={quoteHref} />}
          size="sm"
          className="gap-1.5"
        >
          <FileText aria-hidden="true" className="size-3.5" /> Request a quote
        </Button>
        <Button
          render={<a href={`tel:${siteConfig.contact.phoneRaw}`} />}
          size="sm"
          variant="outline"
          className="gap-1.5"
        >
          <Phone aria-hidden="true" className="size-3.5" /> Call marketplace
          desk
        </Button>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  PackageOpen,
  Phone,
  SearchX,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { MobileActionBar } from "@/components/common/mobile-action-bar";
import { toCardProduct } from "@/components/marketplace/card-product";
import {
  listingHref,
  parseKind,
  parseSearch,
  parseSort,
  parseView,
  sortToApi,
  type KindKey,
  type ListingView,
} from "@/components/marketplace/category-filters";
import { CategoryToolbar } from "@/components/marketplace/category/CategoryToolbar";
import { ProductResults } from "@/components/marketplace/category/ProductResults";
import { SupplierResults } from "@/components/marketplace/category/SupplierResults";
import { CategoryImageCard } from "@/components/marketplace/CategoryImageCard";
import { ChipRail } from "@/components/marketplace/ChipRail";
import {
  MarketplaceBreadcrumb,
  type Crumb,
} from "@/components/marketplace/MarketplaceBreadcrumb";
import { MediaImage } from "@/components/marketplace/MediaImage";
import { QuoteListAction } from "@/components/marketplace/quote-list/QuoteListAction";
import { telHref } from "@/components/marketplace/product-meta";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/routes.config";
import { siteConfig } from "@/config/site.config";
import {
  marketplaceService,
  type MarketplaceCategory,
  type TreeDepartment,
} from "@/services/marketplace.service";
import type { Paginated } from "@/services/http-client";

export const dynamic = "force-dynamic";

const CATEGORY_FALLBACK_IMAGE = "/marketplace-reference/cat-materials.png";
// Size of the server-rendered page. The "load more" server actions must request
// the same size, so page N+1 continues exactly where this page ends.
const PAGE_SIZE = 24;
const RELATED_LIMIT = 8;

// Quiet secondary button (the primary one is `btn-tactile`). Hover comes from
// Tailwind's hover variant, which is already pointer-gated.
const SECONDARY_BUTTON =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-4 text-sm font-semibold text-ink-800 transition-[background-color,border-color,scale] duration-140 ease-(--ease-out) hover:border-ink-300 hover:bg-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 active:scale-[0.97] motion-reduce:active:scale-100";

type SearchParams = {
  page?: string;
  view?: string;
  sort?: string;
  kind?: string;
  q?: string;
};

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
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

function emptyPage<T>(page: number, limit = PAGE_SIZE): Paginated<T> {
  return {
    data: [],
    meta: { page, limit, total: 0, totalPages: 0 },
  };
}

type ListState<T> = { page: Paginated<T>; failed: boolean };

/** Resolves to an empty page (flagged `failed`) instead of throwing. */
async function settle<T>(
  request: Promise<Paginated<T>>,
  page: number,
  limit: number,
): Promise<ListState<T>> {
  try {
    return { page: await request, failed: false };
  } catch {
    return { page: emptyPage<T>(page, limit), failed: true };
  }
}

type ListingQuery = {
  category: string;
  kind?: "SUPPLIER" | "SERVICE";
  search?: string;
};

/**
 * Fetches the active view's page plus the other view's total (a `limit: 1`
 * probe), so a category page costs two API calls instead of four.
 */
async function loadListing(
  query: ListingQuery,
  sp: SearchParams,
  page: number,
) {
  const requestedView = parseView(sp.view);
  const productSort = sortToApi(parseSort(sp.sort, "products"));
  const supplierSort = sortToApi(parseSort(sp.sort, "suppliers"));

  const products = (p: number, limit: number) =>
    settle(
      marketplaceService.listProducts({
        ...query,
        page: p,
        limit,
        sort: productSort,
      }),
      p,
      limit,
    );
  const suppliers = (p: number, limit: number) =>
    settle(
      marketplaceService.listSuppliers({
        ...query,
        page: p,
        limit,
        sort: supplierSort,
      }),
      p,
      limit,
    );

  let view: ListingView = requestedView ?? "products";
  let [productList, supplierList] = await Promise.all([
    products(view === "products" ? page : 1, view === "products" ? PAGE_SIZE : 1),
    suppliers(view === "suppliers" ? page : 1, view === "suppliers" ? PAGE_SIZE : 1),
  ]);

  // No explicit view and no products: open on the sellers instead. Skipped while
  // searching so typing never flips the visitor to another list.
  if (
    !requestedView &&
    !query.search &&
    productList.page.meta.total === 0 &&
    supplierList.page.meta.total > 0
  ) {
    view = "suppliers";
    supplierList = await suppliers(page, PAGE_SIZE);
  }

  // A stale ?page= past the end of the list: show the first page instead.
  if (page > 1) {
    if (
      view === "products" &&
      productList.page.data.length === 0 &&
      productList.page.meta.total > 0
    ) {
      productList = await products(1, PAGE_SIZE);
    } else if (
      view === "suppliers" &&
      supplierList.page.data.length === 0 &&
      supplierList.page.meta.total > 0
    ) {
      supplierList = await suppliers(1, PAGE_SIZE);
    }
  }

  return { view, productList, supplierList };
}

/** Category-wide totals, ignoring search and seller type (header meta line). */
async function loadOverallTotals(category: string) {
  const [products, suppliers] = await Promise.all([
    marketplaceService
      .listProducts({ category, page: 1, limit: 1 })
      .then((result) => result.meta.total)
      .catch(() => null),
    marketplaceService
      .listSuppliers({ category, page: 1, limit: 1 })
      .then((result) => result.meta.total)
      .catch(() => null),
  ]);
  return { products, suppliers };
}

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
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
  // `q` can arrive as an array (?q=a&q=b); only a single string counts.
  const search = parseSearch(typeof sp.q === "string" ? sp.q : undefined);

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
          <p className="text-sm text-ink-600">
            The marketplace could not be loaded right now. You can still ask for
            a price.
          </p>
          <Button
            render={<Link href={ROUTES.MARKETPLACE_REQUEST} />}
            className="mt-4"
          >
            Ask for a price
          </Button>
        </div>
      </main>
    );
  }

  const { node, dept, level, children, siblings } = found;
  const isCategory = level === "CATEGORY";
  const basePath = ROUTES.MARKETPLACE_CATEGORY(node.slug);

  // The price-request link prefills the wizard at the right depth.
  const quoteHref = isCategory
    ? `${ROUTES.MARKETPLACE_REQUEST}?dept=${dept?.slug ?? ""}&cat=${node.slug}`
    : `${ROUTES.MARKETPLACE_REQUEST}?dept=${node.slug}`;
  const desk = telHref(siteConfig.contact.phoneRaw);

  const kind: KindKey = parseKind(sp.kind);
  const kindParam = kind === "all" ? undefined : kind;
  const filtered = kindParam !== undefined || search !== "";

  // Category counts for the tiles (the tree does not carry them), the listing,
  // and, only when a filter is on, the unfiltered totals for the header. All in
  // parallel.
  const [allCategories, listing, overall] = await Promise.all([
    marketplaceService
      .listCategories()
      .catch(() => [] as MarketplaceCategory[]),
    isCategory
      ? loadListing(
          { category: node.slug, kind: kindParam, search: search || undefined },
          sp,
          page,
        )
      : null,
    isCategory && filtered ? loadOverallTotals(node.slug) : null,
  ]);

  const counts = new Map<string, number>();
  for (const category of allCategories) {
    counts.set(category.slug, category.productCount ?? 0);
  }

  const view: ListingView = listing?.view ?? "products";
  const sort = parseSort(sp.sort, view);
  const productTotal = listing?.productList.page.meta.total ?? 0;
  const supplierTotal = listing?.supplierList.page.meta.total ?? 0;

  const related = siblings
    .filter((category) => category.slug !== node.slug)
    .slice(0, RELATED_LIMIT);

  const heroImage = node.image?.url ?? node.iconUrl ?? CATEGORY_FALLBACK_IMAGE;
  const categoryDescription =
    node.description ??
    `Browse ${node.name}, add items to a quote list and sellers reply with a price.`;

  const breadcrumbTrail: Crumb[] = [
    ...(dept
      ? [{ label: dept.name, href: ROUTES.MARKETPLACE_CATEGORY(dept.slug) }]
      : []),
    { label: node.name },
  ];

  // Header meta line, e.g. "154 products · 1 seller". Zero and unknown (failed)
  // parts are left out rather than shown as "0".
  const productCount = overall
    ? overall.products
    : listing?.productList.failed
      ? null
      : productTotal;
  const supplierCount = overall
    ? overall.suppliers
    : listing?.supplierList.failed
      ? null
      : supplierTotal;
  const metaParts = isCategory
    ? [
        productCount ? plural(productCount, "product", "products") : null,
        supplierCount ? plural(supplierCount, "seller", "sellers") : null,
      ].filter((part): part is string => part !== null)
    : [plural(children.length, "category", "categories")];

  const header = (
    <header className="container-page pt-4 sm:pt-6">
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-ink-100">
          <MediaImage
            src={heroImage}
            alt=""
            fill
            sizes="56px"
            className="object-cover"
            fallback={
              <span className="flex size-full select-none items-center justify-center bg-brand-50 font-heading text-xl font-bold text-brand-700">
                {node.name.charAt(0)}
              </span>
            }
          />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="wrap-break-word text-balance font-heading text-2xl font-semibold leading-tight text-ink-900 sm:text-3xl">
            {node.name}
          </h1>
          <p className="mt-1 line-clamp-2 max-w-2xl text-sm leading-snug text-ink-600 sm:text-base">
            {categoryDescription}
          </p>
          {metaParts.length > 0 && (
            <p className="mt-1.5 text-sm font-medium tabular-nums text-ink-600">
              {metaParts.join(" · ")}
            </p>
          )}
        </div>
        {/* Phones get this in the bottom action bar. */}
        <div className="hidden shrink-0 items-center gap-2 md:flex">
          <Link href={quoteHref} className="btn-tactile btn-tactile--sm">
            Ask for a price
          </Link>
          {desk ? (
            <a href={desk} className={SECONDARY_BUTTON}>
              <Phone aria-hidden="true" className="size-4" />
              Call
            </a>
          ) : null}
        </div>
      </div>
    </header>
  );

  // One scrollable chip row: sibling categories (or all departments).
  const chips = (
    <div className="container-page mt-4 sm:mt-5">
      <ChipRail
        label={
          isCategory
            ? `Categories in ${dept?.name ?? "marketplace"}`
            : "Departments"
        }
      >
        {siblings.map((chip) => (
          <Link
            key={chip.slug}
            href={ROUTES.MARKETPLACE_CATEGORY(chip.slug)}
            aria-current={chip.slug === node.slug ? "page" : undefined}
            className="glass-chip min-h-11 sm:min-h-10"
          >
            {chip.name}
          </Link>
        ))}
      </ChipRail>
    </div>
  );

  const actionBar = (
    <MobileActionBar label="Ask for a price">
      <QuoteListAction>
        <Link href={quoteHref} className="btn-tactile flex-1">
          Ask for a price
        </Link>
      </QuoteListAction>
      {desk ? (
        <a
          href={desk}
          aria-label="Call the marketplace desk"
          className="btn-glass size-11 shrink-0 p-0!"
        >
          <Phone aria-hidden="true" className="size-4" />
        </a>
      ) : null}
    </MobileActionBar>
  );

  // ── Department: its categories as tiles ──────────────────────────────────────
  if (!listing) {
    return (
      <main id="main-content" className="bg-white">
        <MarketplaceBreadcrumb trail={breadcrumbTrail} />
        {header}
        {chips}

        <section className="container-page pb-8 pt-4 sm:pb-12 sm:pt-6">
          {children.length > 0 ? (
            <>
              <h2 className="sr-only">Categories in {node.name}</h2>
              <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
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
            </>
          ) : (
            <EmptyState
              icon={PackageOpen}
              title={`Nothing listed in ${node.name} yet`}
              body="Tell us what you need. The marketplace desk passes it to sellers, and they reply with a price."
            >
              <Link href={quoteHref} className="btn-tactile btn-tactile--sm">
                Ask for a price
              </Link>
              <Link href={ROUTES.MARKETPLACE} className={SECONDARY_BUTTON}>
                Browse the marketplace
              </Link>
            </EmptyState>
          )}
        </section>

        {actionBar}
      </main>
    );
  }

  // ── Category: products or sellers ────────────────────────────────────────────
  const { productList, supplierList } = listing;
  const active = view === "products" ? productList : supplierList;
  const activeEmpty = active.page.data.length === 0;
  const otherTotal = view === "products" ? supplierTotal : productTotal;
  const nothingListed =
    !filtered &&
    !productList.failed &&
    !supplierList.failed &&
    productTotal === 0 &&
    supplierTotal === 0;
  // With nothing to search or sort there is no toolbar, just the empty state.
  const showToolbar = !active.failed && !nothingListed;

  const resultQuery = {
    category: node.slug,
    sort: sortToApi(sort),
    kind: kindParam,
    search: search || undefined,
  };
  const nextHref =
    active.page.meta.page < active.page.meta.totalPages
      ? listingHref(basePath, {
          view,
          sort,
          kind,
          search,
          page: active.page.meta.page + 1,
        })
      : null;
  // Remounts the lists when the query changes so appended pages never leak
  // from one query into the next.
  const resultsKey = [view, resultQuery.sort ?? "", kind, search].join("|");
  const viewNoun = view === "products" ? "products" : "sellers";

  let empty: ReactNode = null;
  if (activeEmpty) {
    if (active.failed) {
      empty = (
        <EmptyState
          icon={SearchX}
          title={`Could not load ${viewNoun}`}
          body="Check your connection and try again. You can still ask for a price."
        >
          <Link
            href={listingHref(basePath, { view, sort, kind, search, page })}
            className={SECONDARY_BUTTON}
          >
            Try again
          </Link>
          <Link href={quoteHref} className="btn-tactile btn-tactile--sm">
            Ask for a price
          </Link>
        </EmptyState>
      );
    } else if (filtered) {
      empty = (
        <EmptyState
          icon={SearchX}
          title={
            search
              ? `No ${viewNoun} match “${search}”`
              : `No ${viewNoun} match this filter`
          }
          body="Try a shorter word or clear the filters. Or ask for a price and sellers reply with what they have."
        >
          <Link
            href={listingHref(basePath, { view })}
            className={SECONDARY_BUTTON}
          >
            Clear filters
          </Link>
          <Link href={quoteHref} className="btn-tactile btn-tactile--sm">
            Ask for a price
          </Link>
        </EmptyState>
      );
    } else if (otherTotal > 0) {
      const otherView: ListingView =
        view === "products" ? "suppliers" : "products";
      empty = (
        <EmptyState
          icon={PackageOpen}
          title={`No ${viewNoun} listed in ${node.name} yet`}
          body={
            view === "products"
              ? "Sellers are listed for this category. See them, or ask for a price."
              : "Products are listed for this category. See them, or ask for a price."
          }
        >
          <Link
            href={listingHref(basePath, { view: otherView })}
            className={SECONDARY_BUTTON}
          >
            {view === "products"
              ? `See ${plural(otherTotal, "seller", "sellers")}`
              : `See ${plural(otherTotal, "product", "products")}`}
          </Link>
          <Link href={quoteHref} className="btn-tactile btn-tactile--sm">
            Ask for a price
          </Link>
        </EmptyState>
      );
    } else {
      empty = (
        <EmptyState
          icon={PackageOpen}
          title={`Nothing listed in ${node.name} yet`}
          body="Tell us what you need. The marketplace desk passes it to sellers, and they reply with a price."
        >
          <Link href={quoteHref} className="btn-tactile btn-tactile--sm">
            Ask for a price
          </Link>
          <Link
            href={dept ? ROUTES.MARKETPLACE_CATEGORY(dept.slug) : ROUTES.MARKETPLACE}
            className={SECONDARY_BUTTON}
          >
            {dept ? `Browse ${dept.name}` : "Browse the marketplace"}
          </Link>
        </EmptyState>
      );
    }
  }

  return (
    <main id="main-content" className="bg-white">
      <MarketplaceBreadcrumb trail={breadcrumbTrail} />
      {header}
      {chips}

      {/* The toolbar sticks within this wrapper, so the results live inside it. */}
      <div className="container-page mt-3 sm:mt-4">
        {showToolbar && (
          <CategoryToolbar
            basePath={basePath}
            view={view}
            sort={sort}
            kind={kind}
            search={search}
            categoryName={node.name}
            productTotal={productTotal}
            supplierTotal={supplierTotal}
          />
        )}

        <div className="mt-3 sm:mt-4">
          {activeEmpty ? (
            empty
          ) : (
            <>
              <h2 className="sr-only">
                {view === "products" ? "Products" : "Sellers"} in {node.name}
              </h2>
              {view === "products" ? (
                <ProductResults
                  key={resultsKey}
                  initial={{
                    ...productList.page,
                    // Client cards: send only the fields a card reads.
                    data: productList.page.data.map(toCardProduct),
                  }}
                  query={resultQuery}
                  nextHref={nextHref}
                />
              ) : (
                <SupplierResults
                  key={resultsKey}
                  initial={supplierList.page}
                  query={resultQuery}
                  categorySlug={node.slug}
                  nextHref={nextHref}
                />
              )}
            </>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section
          className="container-page mt-8 pb-8 sm:mt-12 sm:pb-12"
          aria-labelledby="related-heading"
        >
          <div className="flex items-baseline justify-between gap-3">
            <h2
              id="related-heading"
              className="font-sans text-lg font-extrabold text-ink-900 sm:text-xl"
            >
              More in {dept?.name ?? "the marketplace"}
            </h2>
            {dept && (
              <Link
                href={ROUTES.MARKETPLACE_CATEGORY(dept.slug)}
                className="inline-flex min-h-11 shrink-0 items-center text-sm font-semibold text-brand-700 transition-colors duration-160 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
              >
                See all
              </Link>
            )}
          </div>
          {/* Phones: a snap rail. From sm: a grid. */}
          <ul className="-mx-4 mt-1 flex scroll-px-4 snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:mt-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-4 xl:grid-cols-5">
            {related.map((category) => (
              <li
                key={category.slug}
                className="w-40 shrink-0 snap-start sm:w-auto sm:min-w-0"
              >
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

      {actionBar}
    </main>
  );
}

function EmptyState({
  icon: Icon,
  title,
  body,
  children,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-2 py-10 text-center sm:py-16">
      <span className="flex size-12 items-center justify-center rounded-full bg-ink-100 text-ink-600">
        <Icon aria-hidden="true" className="size-6" />
      </span>
      <h2 className="mt-4 wrap-break-word text-balance font-sans text-lg font-extrabold text-ink-900">
        {title}
      </h2>
      <p className="mt-1.5 text-pretty text-sm leading-relaxed text-ink-600">
        {body}
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {children}
      </div>
    </div>
  );
}

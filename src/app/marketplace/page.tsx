import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  Building2,
  ChevronDown,
  CircleDollarSign,
  Headphones,
  LayoutDashboard,
  Lock,
  Package,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
  TrendingUp,
  Truck,
  User,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/routes.config";
import { siteConfig } from "@/config/site.config";
import { cn } from "@/lib/utils";
import {
  marketplaceService,
  type MarketplaceCategory,
} from "@/services/marketplace.service";
import { projectsService } from "@/services/projects.service";
import { heroService } from "@/services/hero.service";
import { AutoHideHeader } from "@/components/layout/auto-hide-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { CountUp } from "@/components/common/count-up";
import { GuidedStart } from "@/components/home/guided-start";
import { HeroCarousel } from "@/components/home/hero-carousel";
import { MarketplaceMegaMenu } from "@/components/marketplace/MarketplaceMegaMenu";
import { FlagshipProjects } from "@/pages-sections/home/flagship-projects";
import {
  toFlagshipProject,
  type FlagshipProject,
} from "@/utils/flagship-project";
import { canOptimize } from "@/utils/image-host";
import { DEPT_ART, GENERIC_CATEGORY_ART } from "@/utils/marketplace-art";
import type { UserRole } from "@/types/user.types";
import { getDashboardRoute } from "@/utils/auth-helpers";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Marketplace - Alivia Properties",
  description:
    "Browse verified suppliers, source construction categories, and request quotes from one construction marketplace.",
};

type MarketplacePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type DepartmentGroup = {
  group: MarketplaceCategory;
  items: MarketplaceCategory[];
};

const FALLBACK_LOGO_MARK = "/marketplace-reference/logo-mark.png";

const FALLBACK_CATEGORIES: MarketplaceCategory[] = [
  {
    id: "dept-materials",
    slug: "materials",
    name: "Materials",
    description: "Cement, steel, aggregates, blocks, and core build supplies.",
    level: "DEPARTMENT",
    order: 1,
  },
  {
    id: "cat-construction-materials",
    slug: "construction-materials",
    name: "Construction Materials",
    description: "2,500+ products",
    level: "CATEGORY",
    parentSlug: "materials",
    image: {
      key: "cat-materials",
      url: "/marketplace-reference/cat-materials.png",
    },
    order: 1,
  },
  {
    id: "dept-equipment",
    slug: "equipment-tools",
    name: "Equipment & Tools",
    description: "Heavy equipment, site tools, and rental support.",
    level: "DEPARTMENT",
    order: 2,
  },
  {
    id: "cat-equipment",
    slug: "equipment-tools",
    name: "Equipment & Tools",
    description: "1,800+ products",
    level: "CATEGORY",
    parentSlug: "equipment-tools",
    image: {
      key: "cat-equipment",
      url: "/marketplace-reference/cat-equipment.png",
    },
    order: 2,
  },
  {
    id: "dept-safety",
    slug: "safety-ppe",
    name: "Safety & PPE",
    description: "Helmets, gloves, harnesses, boots, and site safety gear.",
    level: "DEPARTMENT",
    order: 3,
  },
  {
    id: "cat-safety",
    slug: "safety-ppe",
    name: "Safety & PPE",
    description: "950+ products",
    level: "CATEGORY",
    parentSlug: "safety-ppe",
    image: { key: "cat-safety", url: "/marketplace-reference/cat-safety.png" },
    order: 3,
  },
  {
    id: "dept-electrical",
    slug: "electrical-lighting",
    name: "Electrical & Lighting",
    description: "Wiring, fixtures, switches, panels, and lighting.",
    level: "DEPARTMENT",
    order: 4,
  },
  {
    id: "cat-electrical",
    slug: "electrical-lighting",
    name: "Electrical & Lighting",
    description: "1,200+ products",
    level: "CATEGORY",
    parentSlug: "electrical-lighting",
    image: {
      key: "cat-electrical",
      url: "/marketplace-reference/cat-electrical.png",
    },
    order: 4,
  },
  {
    id: "dept-plumbing",
    slug: "plumbing-hvac",
    name: "Plumbing & HVAC",
    description: "Pipes, pumps, fixtures, ducts, and climate systems.",
    level: "DEPARTMENT",
    order: 5,
  },
  {
    id: "cat-plumbing",
    slug: "plumbing-hvac",
    name: "Plumbing & HVAC",
    description: "1,100+ products",
    level: "CATEGORY",
    parentSlug: "plumbing-hvac",
    image: {
      key: "cat-plumbing",
      url: "/marketplace-reference/cat-plumbing.png",
    },
    order: 5,
  },
  {
    id: "dept-interior",
    slug: "interior-finishing",
    name: "Interior & Finishing",
    description:
      "Tiles, paints, doors, sanitary, kitchen, and finishing items.",
    level: "DEPARTMENT",
    order: 6,
  },
  {
    id: "cat-interior",
    slug: "interior-finishing",
    name: "Interior & Finishing",
    description: "1,300+ products",
    level: "CATEGORY",
    parentSlug: "interior-finishing",
    image: {
      key: "cat-interior",
      url: "/marketplace-reference/cat-interior.png",
    },
    order: 6,
  },
  {
    id: "dept-services",
    slug: "services",
    name: "Services",
    description: "Contractors, installers, repair teams, and construction services.",
    level: "DEPARTMENT",
    order: 7,
  },
  {
    id: "cat-services",
    slug: "services",
    name: "Services",
    description: "900+ services",
    level: "CATEGORY",
    parentSlug: "services",
    image: {
      key: "cat-services",
      url: "/marketplace-reference/cat-services.png",
    },
    order: 7,
  },
  {
    id: "dept-deals",
    slug: "deals-offers",
    name: "Deals & Offers",
    description: "Bulk offers, seasonal discounts, and limited supply deals.",
    level: "DEPARTMENT",
    order: 8,
  },
  {
    id: "cat-deals",
    slug: "deals-offers",
    name: "Deals & Offers",
    description: "500+ deals",
    level: "CATEGORY",
    parentSlug: "deals-offers",
    image: { key: "cat-deals", url: "/marketplace-reference/cat-deals.png" },
    order: 8,
  },
];

const DEPARTMENT_ICON_RULES: Array<{ keywords: string[]; icon: LucideIcon }> = [
  {
    keywords: ["material", "cement", "steel", "tile", "block", "brick"],
    icon: Boxes,
  },
  {
    keywords: ["equipment", "tool", "machine", "hardware", "lift"],
    icon: Wrench,
  },
  { keywords: ["safety", "ppe", "fire", "security"], icon: ShieldCheck },
  {
    keywords: ["electric", "electrical", "light", "power", "cable", "solar"],
    icon: Zap,
  },
  { keywords: ["plumbing", "hvac", "sanitary", "water", "pipe"], icon: Truck },
  {
    keywords: ["interior", "finish", "paint", "door", "kitchen", "furniture"],
    icon: Store,
  },
  {
    keywords: ["service", "contractor", "repair", "maintenance"],
    icon: Headphones,
  },
  { keywords: ["deal", "offer", "discount"], icon: Sparkles },
];

const BENEFITS = [
  {
    icon: ShieldCheck,
    title: "Verified Sellers",
    body: "Only verified & reliable sellers",
    accent: "brand",
  },
  {
    icon: CircleDollarSign,
    title: "Best Price Guarantee",
    body: "Find the best prices always",
    accent: "gold",
  },
  {
    icon: Boxes,
    title: "Bulk Order Discounts",
    body: "More quantity, more savings",
    accent: "brand",
  },
  {
    icon: Truck,
    title: "Fast & Safe Delivery",
    body: "On-time delivery across country",
    accent: "gold",
  },
  {
    icon: Lock,
    title: "Secure Payments",
    body: "100% secure payments",
    accent: "brand",
  },
] as const;

function getParam(
  params: Record<string, string | string[] | undefined> | undefined,
  key: string,
) {
  const value = params?.[key];

  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] ?? "";
  return "";
}

function levelOf(category: MarketplaceCategory) {
  if (category.level) return category.level;
  if (!category.parentSlug) return "DEPARTMENT";
  return "CATEGORY";
}

function imageForCategory(category: MarketplaceCategory) {
  return category.image?.url ?? category.iconUrl ?? null;
}

function iconForKeyword(label: string) {
  const lower = label.toLowerCase();
  const rule = DEPARTMENT_ICON_RULES.find(({ keywords }) =>
    keywords.some((keyword) => lower.includes(keyword)),
  );

  return rule?.icon ?? Package;
}

function categoryMatches(
  category: MarketplaceCategory,
  query: string,
  parentName: string | undefined,
) {
  if (!query) return true;

  const haystack = [category.name, category.description ?? "", parentName ?? ""]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

export default async function MarketplacePage({
  searchParams,
}: MarketplacePageProps) {
  const params = await searchParams;
  const initialSearch = getParam(params, "search");
  const selectedDepartment = getParam(params, "department");
  const query = initialSearch.trim().toLowerCase();

  const session = await auth();
  const dashboardHref = session?.user?.role
    ? getDashboardRoute(session.user.role as UserRole)
    : null;

  const [categoriesRes, projectsRes, heroRes, suppliersRes] = await Promise.allSettled([
    marketplaceService.listCategories(),
    projectsService.list({ limit: 3 }),
    heroService.listActive(),
    marketplaceService.listSuppliers({ limit: 1 }),
  ]);

  // Real, live count for the "Verified Sellers" benefit (hidden when unknown).
  const suppliersTotal =
    suppliersRes.status === "fulfilled" ? suppliersRes.value.meta.total : 0;

  const heroSlides = heroRes.status === "fulfilled" ? heroRes.value : [];

  const flagship: FlagshipProject[] = (
    projectsRes.status === "fulfilled" ? projectsRes.value.data : []
  ).map(toFlagshipProject);

  const loadedCategories =
    categoriesRes.status === "fulfilled" ? categoriesRes.value : [];
  const categories =
    loadedCategories.length > 0 ? loadedCategories : FALLBACK_CATEGORIES;

  const parentNameBySlug = new Map(
    categories.map((category) => [category.slug, category.name]),
  );

  const groups = categories
    .filter((category) => levelOf(category) === "DEPARTMENT")
    .sort((a, b) => a.order - b.order);

  const childrenByGroup = categories
    .filter((category) => levelOf(category) === "CATEGORY")
    .reduce<Record<string, MarketplaceCategory[]>>((acc, category) => {
      const key = category.parentSlug;
      if (!key) return acc;
      (acc[key] ??= []).push(category);
      return acc;
    }, {});

  Object.values(childrenByGroup).forEach((items) =>
    items.sort((a, b) => a.order - b.order),
  );

  const visibleGroups: DepartmentGroup[] = groups
    .map((group) => {
      const items = (childrenByGroup[group.slug] ?? []).filter((category) => {
        if (selectedDepartment && group.slug !== selectedDepartment)
          return false;

        return categoryMatches(
          category,
          query,
          parentNameBySlug.get(category.parentSlug ?? ""),
        );
      });

      return { group, items };
    })
    .filter(({ items }) => items.length > 0);

  const clearingSearch = !query && !selectedDepartment;

  return (
    <>
    <main id="main-content" className="storefront bg-ink-50 text-ink-900">
      {/* Partner strip: one line that scrolls sideways on phones instead of wrapping. */}
      <section className="bg-brand-950 text-white">
        <div className="container-page max-w-373! flex min-h-11 items-center gap-1 overflow-x-auto py-0.5 text-xs font-semibold text-brand-100/90 scrollbar-none sm:justify-end sm:gap-4 sm:py-1">
          <Link
            href={ROUTES.BECOME_SUPPLIER}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Store aria-hidden="true" className="size-3.5" />
            Be a Supplier
          </Link>
          <Link
            href={ROUTES.BECOME_INVESTOR}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3 transition-colors hover:bg-white/10 hover:text-white"
          >
            <TrendingUp aria-hidden="true" className="size-3.5" />
            Be an Investor
          </Link>
          <Link
            href={ROUTES.BUYER_MARKETPLACE_QUOTES}
            className="inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-full px-3 transition-colors hover:bg-white/10 hover:text-white"
          >
            My Orders
          </Link>
          <a
            href={`tel:${siteConfig.contact.phoneRaw}`}
            className="inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-full px-3 transition-colors hover:bg-white/10 hover:text-white"
          >
            Help & Support
          </a>
        </div>
      </section>

      {/* Brand row: scrolls away with the page below xl (the logo returns inside
          the sticky bar from xl). */}
      <div className="container-page max-w-373! flex h-[3.25rem] items-center justify-between gap-3 xl:hidden">
        <Link href={ROUTES.MARKETPLACE} className="flex min-w-0 items-center gap-2.5">
          <span className="relative size-9 shrink-0 overflow-hidden">
            <Image
              src={FALLBACK_LOGO_MARK}
              alt=""
              fill
              unoptimized
              sizes="36px"
              className="object-cover"
            />
          </span>
          <span className="block truncate text-lg font-bold text-brand-950">
            {siteConfig.name}
          </span>
        </Link>
        <Link
          href={dashboardHref ?? ROUTES.LOGIN}
          aria-label={dashboardHref ? "Go to dashboard" : "My account"}
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-ink-700 transition-colors hover:bg-brand-50 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
        >
          {dashboardHref ? (
            <LayoutDashboard aria-hidden="true" className="size-4.5" />
          ) : (
            <User aria-hidden="true" className="size-4.5" />
          )}
        </Link>
      </div>

      {/* Sticky bar. It leaves on scroll-down and returns on scroll-up. Below xl it
          is a floating Liquid Glass capsule (menu + search + cart) that content
          scrolls under; from xl it is the familiar full-width bar. */}
      <AutoHideHeader
        as="section"
        aria-label="Marketplace search and account"
        className="sticky top-0 z-30 pb-2 pt-1 xl:border-b xl:border-border/60 xl:bg-white/95 xl:p-0 xl:backdrop-blur xl:supports-backdrop-filter:bg-white/88"
      >
        <div className="container-page max-w-373! xl:grid xl:grid-cols-[auto_11.5rem_minmax(0,1fr)_auto] xl:items-center xl:gap-4 xl:py-2.5">
          <Link
            href={ROUTES.MARKETPLACE}
            className="hidden min-w-0 items-center gap-3 xl:flex"
          >
            <span className="relative size-11 shrink-0 overflow-hidden">
              <Image
                src={FALLBACK_LOGO_MARK}
                alt=""
                fill
                unoptimized
                sizes="44px"
                className="object-cover"
              />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-3xl font-bold text-brand-950">
                {siteConfig.name}
              </span>
              <span className="block text-xs text-ink-500">
                Construction marketplace
              </span>
            </span>
          </Link>

          <div className="liquid-glass-nav flex items-center gap-1.5 rounded-2xl border p-1.5 xl:contents">
            <MarketplaceMegaMenu
              data={{
                departments: groups,
                categoriesByDepartment: childrenByGroup,
              }}
            />

            <div className="min-w-0 flex-1 xl:contents">
              <MarketplaceSearchForm
                departments={groups}
                initialSearch={initialSearch}
                selectedDepartment={selectedDepartment}
                compact
              />
            </div>

            {/* Cart: in the sticky capsule on phones so it is never a scroll away */}
            <Link
              href={ROUTES.MARKETPLACE_REQUEST}
              aria-label="Quote request list"
              className="pressable relative flex size-11 shrink-0 items-center justify-center rounded-xl text-ink-900 transition-colors hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 xl:hidden"
            >
              <ShoppingCart aria-hidden="true" className="size-5" />
              <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-gold-400 text-[10px] font-bold text-brand-950">
                0
              </span>
            </Link>
          </div>

          {/* Labeled account/cart: xl only */}
          <div className="hidden items-center gap-3 xl:flex xl:justify-self-end">
            <Link
              href={dashboardHref ?? ROUTES.LOGIN}
              className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-ink-700 transition-colors hover:bg-brand-50 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            >
              {dashboardHref ? (
                <LayoutDashboard aria-hidden="true" className="size-4" />
              ) : (
                <User aria-hidden="true" className="size-4" />
              )}
              {dashboardHref ? "Dashboard" : "My Account"}
            </Link>
            <Link href={ROUTES.MARKETPLACE_REQUEST}>
              <Button
                size="lg"
                className="relative h-11 rounded-full bg-white px-3 text-ink-900 shadow-none hover:bg-brand-50"
              >
                <ShoppingCart aria-hidden="true" className="size-4" />
                <span className="absolute -right-1 top-0 flex size-4 items-center justify-center rounded-full bg-gold-400 text-[10px] font-bold text-brand-950">
                  0
                </span>
              </Button>
            </Link>
          </div>
        </div>
      </AutoHideHeader>

      {/* Department quick links: normal flow (not sticky), so they never add to the bar. */}
      {visibleGroups.length > 0 ? (
        <nav aria-label="Marketplace departments" className="xl:border-b xl:border-border/60 xl:bg-white">
          <div className="container-page max-w-373! flex items-center gap-1.5 overflow-x-auto pb-3 pt-1 scrollbar-none sm:py-2">
            <Link
              href="/apartments"
              className="btn-tactile btn-tactile--sm btn-tactile--gold shrink-0 sm:!min-h-[calc(2.75rem+var(--tactile-depth))] sm:!px-5"
            >
              Browse all apartments
            </Link>
            {visibleGroups.slice(0, 8).map(({ group }) => {
              const Icon = iconForKeyword(group.name);
              return (
                <Link
                  key={group.slug}
                  href={`#department-${group.slug}`}
                  className="glass-chip gap-1.5 sm:min-h-11 sm:px-4 sm:text-sm"
                >
                  <Icon aria-hidden="true" className="size-4 text-brand-700" />
                  {group.name}
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}

      {clearingSearch && (
        <>
          <HeroCarousel slides={heroSlides} />

          <section className="border-y border-border/60 bg-linear-to-r from-brand-50/70 via-white to-gold-50/50">
            <div className="container-page max-w-373! flex snap-x gap-x-8 gap-y-3 overflow-x-auto py-4 scrollbar-none sm:overflow-visible">
              {BENEFITS.map(({ icon: Icon, title, body, accent }) => (
                <div
                  key={title}
                  className="group flex min-w-62 shrink-0 snap-start items-center gap-3 sm:min-w-0 sm:flex-1 sm:border-r sm:border-border/60 sm:pr-5 sm:last:border-r-0 sm:last:pr-0"
                >
                  <span
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-full shadow-sm transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:scale-105",
                      accent === "gold"
                        ? "bg-gold-400 text-brand-950"
                        : "bg-brand-700 text-white",
                    )}
                  >
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink-900">
                      {title}
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-xs leading-5 text-ink-600">
                      {title === "Verified Sellers" && suppliersTotal > 0 ? (
                        <>
                          <CountUp value={suppliersTotal} /> verified sellers
                        </>
                      ) : (
                        body
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Two quick questions, then straight to the right page */}
          <section className="container-page max-w-373! pt-4 sm:pt-8">
            <GuidedStart
              departments={groups.map((g) => ({ slug: g.slug, name: g.name }))}
            />
          </section>

          {/* Flagship projects */}
          <FlagshipProjects projects={flagship} />
        </>
      )}

      <section
        id="shop-by-category"
        className="container-page max-w-373! pb-3 pt-4 sm:pb-4 sm:pt-1"
      >
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div>
            <h2 className="font-sans text-xl font-extrabold leading-tight text-ink-900 sm:text-2xl sm:leading-7">
              {clearingSearch
                ? <>
                    Build by <span className="text-gold-600">Category</span>
                  </>
                : initialSearch
                  ? `Results for “${initialSearch}”`
                  : "Search results"}
            </h2>
            <p className="sr-only">
              {query || selectedDepartment
                ? `Showing category matches for "${initialSearch || "selected filters"}".`
                : "Start with the department that fits your build stage, then open the category that matches your exact sourcing need."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {!clearingSearch ? (
              <Link href={ROUTES.MARKETPLACE} className="glass-chip sm:min-h-11 sm:px-4 sm:text-sm">
                Clear filters
              </Link>
            ) : null}
            <Link
              href={ROUTES.MARKETPLACE_REQUEST}
              className="inline-flex min-h-9 items-center gap-1.5 text-[0.8125rem] font-semibold text-brand-700 transition-colors hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 sm:min-h-11 sm:text-sm"
            >
              Can&apos;t find it? Book For Consultations
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </div>

        {visibleGroups.length > 0 ? (
          <div className="mt-2 space-y-6 sm:mt-4 sm:space-y-10">
            {visibleGroups.map(({ group, items }) => {
              const GroupIcon = iconForKeyword(group.name);
              const shown = items.slice(0, 5);

              return (
                <div
                  key={group.slug}
                  id={`department-${group.slug}`}
                  aria-label={group.name}
                  className="scroll-mt-2"
                >
                  <div className="mb-2.5 flex items-center justify-between gap-3 sm:mb-4">
                    <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-800 sm:size-10">
                        <GroupIcon aria-hidden="true" className="size-4 sm:size-5" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-sans text-base font-extrabold leading-5 text-ink-900 sm:text-xl sm:leading-6">
                          {group.name}
                        </h3>
                        {group.description ? (
                          <p className="line-clamp-1 text-xs text-ink-600 sm:text-sm">
                            {group.description}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {items.length > 5 ? (
                      <Link
                        href={ROUTES.MARKETPLACE_CATEGORY(group.slug)}
                        className="glass-chip gap-1.5 text-brand-800 sm:min-h-11 sm:px-5 sm:text-sm"
                      >
                        <span className="hidden sm:inline">
                          See all {group.name}
                        </span>
                        <span className="sm:hidden">See all</span>
                        <ArrowRight aria-hidden="true" className="size-3.5 sm:size-4" />
                      </Link>
                    ) : null}
                  </div>

                  {/* Phones: 2 columns of photo tiles with the caption on the photo, so
                      5 to 6 categories fit one screen. An odd count opens with one wide
                      tile, so the grid never ends on an orphan. */}
                  <div className="reveal-stagger grid grid-cols-2 gap-2.5 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {shown.map((category, index) => {
                      const count = category.productCount ?? 0;
                      const productLabel =
                        count > 0
                          ? `${count} ${count === 1 ? "product" : "products"}`
                          : category.description || "Browse category";
                      const wide = index === 0 && shown.length % 2 === 1;
                      const tileSrc =
                        imageForCategory(category) ??
                        DEPT_ART[group.slug] ??
                        GENERIC_CATEGORY_ART;

                      return (
                        <Link
                          key={category.slug}
                          href={ROUTES.MARKETPLACE_CATEGORY(category.slug)}
                          data-card
                          className={cn(
                            "group relative block overflow-hidden rounded-2xl border border-white/70 bg-ink-100 shadow-sm transition-[translate,scale,box-shadow] duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 sm:flex sm:flex-col sm:rounded-lg sm:border-border/70 sm:bg-white sm:hover:-translate-y-1 sm:hover:border-brand-200 sm:hover:shadow-[0_16px_40px_rgba(12,48,39,0.08)]",
                            wide && "col-span-2 sm:col-span-1",
                          )}
                        >
                          <div
                            className={cn(
                              "relative overflow-hidden bg-ink-100 sm:aspect-[1.65]",
                              wide ? "aspect-[2.1/1]" : "aspect-[4/3]",
                            )}
                          >
                            <Image
                              src={tileSrc}
                              alt={category.name}
                              fill
                              unoptimized={!canOptimize(tileSrc)}
                              sizes={
                                wide
                                  ? "(max-width: 640px) 100vw, (max-width: 1280px) 25vw, 16vw"
                                  : "(max-width: 640px) 50vw, (max-width: 1280px) 25vw, 16vw"
                              }
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            <div
                              aria-hidden="true"
                              className="absolute inset-0 bg-linear-to-t from-brand-950/35 via-transparent to-transparent sm:from-brand-950/45"
                            />
                          </div>

                          <div className="glass-caption sm:flex sm:flex-1 sm:flex-col sm:px-3 sm:pb-3 sm:pt-3">
                            <div className="flex items-start justify-between gap-2">
                              <p className="line-clamp-2 text-[0.8125rem] font-extrabold leading-snug text-ink-900 group-hover:text-brand-800 sm:text-sm">
                                {category.name}
                              </p>
                              <span className="mt-0.5 hidden size-6 shrink-0 items-center justify-center rounded-full bg-brand-800 text-white transition-colors group-hover:bg-brand-950 sm:inline-flex">
                                <ArrowRight aria-hidden="true" className="size-3.5" />
                              </span>
                            </div>
                            <p className="mt-0.5 line-clamp-1 text-[0.6875rem] font-medium text-ink-600 sm:mt-1 sm:line-clamp-2 sm:text-xs">
                              {productLabel}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-border bg-white px-4 py-8 text-center sm:mt-6 sm:rounded-[1.5rem] sm:px-6 sm:py-14">
            <p className="text-lg font-semibold text-ink-900">
              No category match yet.
            </p>
            <p className="mt-2 text-sm text-ink-500">
              Try another keyword, clear filters, or open the quote form and let
              our desk route the request.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3 sm:mt-5">
              <Link href={ROUTES.MARKETPLACE} className="btn-glass">
                Clear filters
              </Link>
              <Link href={ROUTES.MARKETPLACE_REQUEST} className="btn-tactile btn-tactile--sm">
                Book For Consultations
              </Link>
            </div>
          </div>
        )}
      </section>

      <section className="container-page max-w-373! pb-5 sm:pb-8">
        <div className="grid overflow-hidden rounded-2xl border border-gold-100 bg-linear-to-r from-gold-50 via-white to-gold-50 shadow-[inset_0_1px_0.5px_rgba(255,255,255,0.9),0_10px_30px_rgba(120,90,20,0.08)] sm:rounded-xl lg:min-h-33.5 lg:grid-cols-[minmax(0,38.75rem)_1fr_1fr_1fr]">
          {/* Promo: icon, headline and two buttons on one compact row on phones. */}
          <article
            id="contractors"
            className="grid md:grid-cols-[minmax(0,1fr)_17rem] lg:min-h-33.5"
          >
            <div className="flex items-start gap-3 p-3.5 sm:items-center sm:gap-4 sm:px-11 sm:py-5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-900 text-gold-400 sm:size-14 sm:rounded-lg">
                <Package aria-hidden="true" className="size-5 sm:size-7" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-sans text-base font-extrabold leading-tight text-ink-900 sm:text-xl">
                  Planning a big project?
                </h3>
                <p className="mt-0.5 text-[0.8125rem] leading-snug text-ink-700 sm:mt-1 sm:text-sm sm:leading-6">
                  Get exclusive discounts on bulk purchases.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 px-3.5 pb-3.5 sm:flex sm:flex-wrap sm:px-11 sm:pb-5 md:col-start-1 md:-mt-2">
              <Link
                href={ROUTES.MARKETPLACE_REQUEST}
                className="btn-tactile btn-tactile--sm !px-3"
              >
                <span className="sm:hidden">Book consultation</span>
                <span className="hidden sm:inline">Book For Consultations</span>
                <ArrowRight aria-hidden="true" className="hidden size-4 sm:block" />
              </Link>
              <Link
                href={ROUTES.PROPERTIES}
                className="btn-tactile btn-tactile--sm btn-tactile--gold !px-3"
              >
                <span className="sm:hidden">Browse properties</span>
                <span className="hidden sm:inline">Browse Properties</span>
                <ArrowRight aria-hidden="true" className="hidden size-4 sm:block" />
              </Link>
            </div>

            <div className="relative col-start-2 row-span-2 row-start-1 hidden min-h-33.5 bg-gold-50 md:block">
              <Image
                src="/marketplace-reference/bulk-project.png"
                alt="Bulk construction materials"
                fill
                unoptimized
                sizes="272px"
                className="object-cover"
              />
              <div
                aria-hidden="true"
                className="absolute inset-y-0 left-0 w-16 bg-linear-to-r from-gold-50 to-transparent"
              />
            </div>
          </article>

          {/* Three entries: a tile strip on phones (title + arrow), full rows from sm. */}
          <div className="grid grid-cols-3 border-t border-border/70 lg:contents">
            {[
              {
                id: undefined,
                href: "#shop-by-category",
                icon: Wrench,
                title: "For Contractors",
                body: "Manage projects, teams and purchases in one place.",
                action: "Learn More",
              },
              {
                id: "suppliers",
                href: ROUTES.BECOME_SUPPLIER,
                icon: Store,
                title: "For Suppliers",
                body: "Grow your business and reach more buyers.",
                action: "Join as a Seller",
              },
              {
                id: "project-solutions",
                href: ROUTES.PROJECTS,
                icon: Building2,
                title: "Construction Solutions",
                body: "End-to-end solutions for your construction needs.",
                action: "Explore Solutions",
              },
            ].map(({ id, href, icon: TileIcon, title, body, action }) => (
              <Link
                key={title}
                id={id}
                href={href}
                aria-label={`${title}: ${action}`}
                className="group flex flex-col items-start gap-2 border-l border-border/70 px-3 py-3 transition-colors duration-200 first:border-l-0 hover:bg-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-400 active:bg-white/80 sm:flex-row sm:items-center sm:gap-4 sm:px-8 sm:py-5 lg:border-t-0"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition-colors group-hover:bg-brand-100 sm:size-12 sm:rounded-lg">
                  <TileIcon aria-hidden="true" className="size-[1.15rem] sm:size-5" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col self-stretch sm:block sm:flex-none sm:self-auto">
                  <h3 className="font-sans text-[0.8125rem] font-extrabold leading-tight text-ink-900 sm:text-base">
                    {title}
                  </h3>
                  <p className="mt-1 hidden text-sm leading-5 text-ink-600 sm:block">
                    {body}
                  </p>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-1.5 text-sm font-semibold text-ink-900 transition-colors group-hover:text-brand-800 sm:mt-2 sm:pt-0">
                    <span className="sr-only sm:not-sr-only">{action}</span>
                    <ArrowRight
                      aria-hidden="true"
                      className="size-4 text-brand-700 transition-transform duration-200 group-hover:translate-x-0.5 sm:text-inherit"
                    />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
    <SiteFooter />
    </>
  );
}

function MarketplaceSearchForm({
  departments,
  initialSearch,
  selectedDepartment,
  compact = false,
  className,
}: {
  departments: MarketplaceCategory[];
  initialSearch: string;
  selectedDepartment: string;
  compact?: boolean;
  className?: string;
}) {
  const selectControl = (
    <div className={cn("relative", compact && "hidden w-28 shrink-0 sm:block sm:w-36")}>
      <select
        name="department"
        defaultValue={selectedDepartment}
        className={cn(
          "h-11 w-full appearance-none bg-white px-4 pr-10 text-sm font-medium text-ink-900 outline-none transition-[border-color,box-shadow] focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-200",
          compact
            ? "rounded-none border-0 border-l border-ink-200"
            : "rounded-none border border-y-0 border-l-0 border-r-ink-200",
        )}
      >
        <option value="">All Categories</option>
        {departments.map((department) => (
          <option key={department.slug} value={department.slug}>
            {department.name}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-ink-500"
      />
    </div>
  );

  const inputControl = (
    <div className="relative min-w-0">
      <input
        id={compact ? "marketplace-header-search" : "marketplace-hero-search"}
        name="search"
        type="search"
        defaultValue={initialSearch}
        autoComplete="off"
        placeholder="Search materials, suppliers"
        className={cn(
          "h-11 w-full bg-white px-3.5 text-sm font-medium text-ink-900 outline-none transition-[border-color,box-shadow] placeholder:text-ink-400 sm:h-12 sm:px-4 focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-200",
          compact ? "rounded-none border-0" : "rounded-none border-0",
        )}
      />
    </div>
  );

  return (
    <form
      action={ROUTES.MARKETPLACE}
      className={cn(
        "grid",
        compact
          ? "grid-cols-[minmax(0,1fr)_3rem] overflow-hidden rounded-xl border border-ink-200 bg-white sm:grid-cols-[minmax(0,1fr)_auto_3rem]"
          : "overflow-hidden rounded-md bg-white md:grid-cols-[11rem_minmax(0,1fr)_3rem]",
        className,
      )}
    >
      <label
        className="sr-only"
        htmlFor={
          compact ? "marketplace-header-search" : "marketplace-hero-search"
        }
      >
        Search marketplace categories
      </label>

      {compact ? inputControl : selectControl}
      {compact ? selectControl : inputControl}

      <Button
        type="submit"
        size="lg"
        aria-label="Search marketplace"
        className={cn(
          "h-11 gap-2 px-4 sm:h-12",
          compact
            ? "rounded-none bg-brand-950 text-white hover:bg-brand-900"
            : "rounded-none bg-gold-400 text-ink-900 hover:bg-gold-300",
        )}
      >
        <Search aria-hidden="true" className="size-4" />
      </Button>
    </form>
  );
}

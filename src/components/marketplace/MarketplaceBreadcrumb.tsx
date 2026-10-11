import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";

import { AutoHideHeader } from "@/components/layout/auto-hide-header";
import { ROUTES } from "@/config/routes.config";

export type Crumb = { label: string; href?: string };

/**
 * The top bar of every marketplace inner page (these pages have no site header,
 * so this is also the way back). `trail` is the path *under* Marketplace (the
 * Marketplace root is prepended automatically); the last item is the current
 * page.
 *
 * Phones: a sticky Liquid Glass bar with a back arrow to the parent and the
 * trail on one scrollable line; it leaves on scroll-down and returns on
 * scroll-up like the site header. From `sm` it is an ordinary bar in the page
 * flow with the "Back to Marketplace" button.
 */
export function MarketplaceBreadcrumb({ trail }: { trail: Crumb[] }) {
  const items: Crumb[] = [
    { label: "Marketplace", href: ROUTES.MARKETPLACE },
    ...trail,
  ];
  const parent =
    [...items.slice(0, -1)].reverse().find((crumb) => crumb.href) ?? items[0];

  return (
    <AutoHideHeader
      as="div"
      className="liquid-glass-nav scroll-edge sticky top-0 z-30 border-0 sm:static sm:border-b sm:shadow-none sm:after:hidden"
    >
      <div className="container-page flex items-center gap-2 py-1.5 sm:justify-between sm:gap-x-4 sm:py-3">
        <Link
          href={parent.href ?? ROUTES.MARKETPLACE}
          aria-label={`Back to ${parent.label}`}
          className="btn-glass size-10 shrink-0 !p-0 sm:hidden"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
        </Link>

        <nav aria-label="Breadcrumb" className="min-w-0 flex-1 sm:flex-none">
          <ol className="flex items-center gap-x-1.5 gap-y-1 overflow-x-auto whitespace-nowrap text-[0.8125rem] scrollbar-none sm:flex-wrap sm:overflow-visible sm:text-sm">
            {items.map((crumb, i) => {
              const isLast = i === items.length - 1;
              return (
                <li
                  key={`${crumb.label}-${i}`}
                  className="flex shrink-0 items-center gap-1.5"
                >
                  {i > 0 && (
                    <ChevronRight
                      aria-hidden="true"
                      className="size-3.5 shrink-0 text-ink-400"
                    />
                  )}
                  {isLast || !crumb.href ? (
                    <span
                      className="font-semibold text-ink-900"
                      aria-current="page"
                    >
                      {crumb.label}
                    </span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className="inline-flex min-h-9 items-center font-medium text-ink-600 transition-colors hover:text-brand-700"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        <Link
          href={ROUTES.MARKETPLACE}
          className="hidden min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-brand-200 bg-white px-4 text-sm font-semibold text-brand-700 shadow-sm transition-[transform,background-color,border-color,color] duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 sm:inline-flex"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to Marketplace
        </Link>
      </div>
    </AutoHideHeader>
  );
}

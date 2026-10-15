import Link from "next/link";
import { ArrowLeft, ChevronRight, Store } from "lucide-react";

import { AutoHideHeader } from "@/components/layout/auto-hide-header";
import { QuoteListButton } from "@/components/marketplace/quote-list/QuoteListButton";
import { ROUTES } from "@/config/routes.config";
import { cn } from "@/lib/utils";

export type Crumb = { label: string; href?: string };

/**
 * Truncation order, strictly (flex sizing, no measuring):
 *  - root: never shrinks (an icon on phones).
 *  - middle: starts at up to 3.5rem (ellipsis plus a few letters) and grows
 *    toward its full label with whatever room is left; never shrinks below
 *    that start. With no room to grow it shows "Fin…".
 *  - last: full width while it fits; only it shrinks, so it gives way only
 *    after the middle crumbs are down to their few letters.
 */
const CRUMB = {
  root: "shrink-0",
  middle: "min-w-0 max-w-max shrink-0 grow basis-14",
  last: "min-w-0",
} as const;

const CRUMB_LINK =
  "rounded-md font-medium text-ink-600 transition-colors duration-160 ease-(--ease-out) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 active:text-brand-800 [@media(hover:hover)_and_(pointer:fine)]:hover:text-brand-700";

/**
 * The top bar of every marketplace inner page (these pages have no site header,
 * so this is also the way back). `trail` is the path *under* Marketplace (the
 * Marketplace root is prepended automatically); the last item is the current
 * page.
 *
 * Phones: a sticky Liquid Glass bar with a back arrow to the parent and the
 * trail on one line; it leaves on scroll-down and returns on scroll-up like the
 * site header. From `sm` it is an ordinary bar in the page flow with the "Back
 * to Marketplace" button. The quote list button sits at the right end on every
 * size.
 *
 * The trail never scrolls or wraps; when it does not fit, it truncates by
 * priority, always with an ellipsis (see CRUMB): the middle crumbs give way
 * first (down to a few letters), then the current page. On phones the
 * Marketplace root is a store icon (named for screen readers) so the crumbs
 * that say where you are get the room.
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
          className="btn-glass size-11 shrink-0 !p-0 sm:hidden"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
        </Link>

        <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
          <ol className="flex min-w-0 items-center gap-x-1.5 whitespace-nowrap text-[0.8125rem] sm:text-sm">
            {items.map((crumb, i) => {
              const isLast = i === items.length - 1;
              const position = isLast ? "last" : i === 0 ? "root" : "middle";
              return (
                <li
                  key={`${crumb.label}-${i}`}
                  className={cn("flex items-center gap-1.5", CRUMB[position])}
                >
                  {i > 0 && (
                    <ChevronRight
                      aria-hidden="true"
                      className="size-3.5 shrink-0 text-ink-400"
                    />
                  )}
                  {isLast || !crumb.href ? (
                    <span
                      className={cn(
                        "block min-w-0 truncate py-2 leading-5",
                        isLast
                          ? "font-semibold text-ink-900"
                          : "font-medium text-ink-600",
                      )}
                      aria-current={isLast ? "page" : undefined}
                      title={crumb.label}
                    >
                      {crumb.label}
                    </span>
                  ) : position === "root" ? (
                    <Link
                      href={crumb.href}
                      // Phones: a 32px icon target whose negative margins keep the
                      // 16px icon spaced like a text crumb (and clear of the back button).
                      className={cn(
                        CRUMB_LINK,
                        "-mx-2 inline-flex min-h-9 min-w-8 items-center justify-center sm:mx-0 sm:min-w-0",
                      )}
                    >
                      <Store aria-hidden="true" className="size-4 sm:hidden" />
                      <span className="max-sm:sr-only">{crumb.label}</span>
                    </Link>
                  ) : (
                    <Link
                      href={crumb.href}
                      title={crumb.label}
                      className={cn(
                        CRUMB_LINK,
                        "block min-w-0 truncate py-2 leading-5",
                      )}
                    >
                      {crumb.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={ROUTES.MARKETPLACE}
            className="hidden min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-brand-200 bg-white px-4 text-sm font-semibold text-brand-700 shadow-sm transition-[scale,background-color,border-color,color] duration-140 ease-(--ease-out) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 active:scale-[0.97] motion-reduce:transition-colors motion-reduce:active:scale-100 [@media(hover:hover)_and_(pointer:fine)]:hover:border-brand-300 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-brand-50 [@media(hover:hover)_and_(pointer:fine)]:hover:text-brand-800 sm:inline-flex"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to Marketplace
          </Link>
          <QuoteListButton />
        </div>
      </div>
    </AutoHideHeader>
  );
}

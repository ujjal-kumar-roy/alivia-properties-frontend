"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Icons from "lucide-react";
import { Home, LogOut, Sparkles, X } from "lucide-react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site.config";
import { ROUTES } from "@/config/routes.config";
import type { DashboardNavItem } from "@/config/dashboard-nav.config";

function NavIcon({ name, className }: { name: string; className?: string }) {
  const Icon =
    (Icons as unknown as Record<string, Icons.LucideIcon>)[name] ??
    Icons.Circle;
  return <Icon className={className} />;
}

interface DashboardSidebarProps {
  nav: DashboardNavItem[];
  pendingCount?: number;
  roleLabel: string;
  /** `static` is the persistent lg+ sidebar; `mobile` is the content of the off-canvas drawer. */
  variant?: "static" | "mobile";
  /** Mobile only: called after a destination is chosen (and by the close button) so the drawer shuts. */
  onNavigate?: () => void;
}

function groupBySection(nav: DashboardNavItem[]) {
  const groups: { section: string; items: DashboardNavItem[] }[] = [];
  for (const item of nav) {
    const section = item.section ?? "Workspace";
    const last = groups[groups.length - 1];
    if (last && last.section === section) {
      last.items.push(item);
    } else {
      groups.push({ section, items: [item] });
    }
  }
  return groups;
}

export function DashboardSidebar({
  nav,
  pendingCount = 0,
  roleLabel,
  variant = "static",
  onNavigate,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const groups = groupBySection(nav);
  const isDrawer = variant === "mobile";

  // Find the single most-specific active item (longest href that matches)
  const activeHref = nav
    .filter(
      (item) => pathname === item.href || pathname.startsWith(item.href + "/"),
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  async function handleSignOut() {
    await signOut({ redirect: false });
    router.push(ROUTES.LOGIN);
  }

  // Inside a modal drawer on touch devices, dismissing it can swallow an anchor's own
  // navigation (the public mobile nav hit the same thing). Navigate through the router, then
  // close on the next frame so the transition is not interrupted.
  const go = (href: string) => (e: React.MouseEvent) => {
    if (!isDrawer || !onNavigate) return;
    e.preventDefault();
    router.push(href);
    requestAnimationFrame(() => onNavigate());
  };

  const wrapperClass = isDrawer
    ? "flex h-full min-h-0 w-full flex-col"
    : "sticky top-0 hidden h-dvh w-72 shrink-0 self-start lg:flex";

  const innerClass = isDrawer
    ? "flex h-full min-h-0 w-full flex-col overflow-hidden"
    : "liquid-glass m-4 flex w-full flex-col overflow-hidden rounded-[1.75rem] border p-4";

  const rowBase =
    "group relative flex items-center gap-3 rounded-2xl px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400";
  const rowSize = isDrawer ? "min-h-11 py-1.5" : "py-2.5";

  return (
    <aside className={wrapperClass} aria-label={isDrawer ? undefined : `${roleLabel} navigation`}>
      <div className={innerClass}>
        {isDrawer ? (
          <div className="flex shrink-0 items-center gap-3 px-4 pb-3 pt-[max(0.875rem,env(safe-area-inset-top))]">
            <Link
              href={ROUTES.HOME}
              onClick={go(ROUTES.HOME)}
              className="flex min-w-0 flex-1 items-center gap-3"
              title="Back to home"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-brand-700 to-brand-500 text-white shadow-elevated">
                <Sparkles className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-brand-700">
                  {siteConfig.shortName}
                </span>
                <span className="block truncate text-sm font-semibold text-ink-900">
                  {roleLabel}
                </span>
              </span>
            </Link>
            <button
              type="button"
              onClick={onNavigate}
              aria-label="Close navigation"
              className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border/70 bg-white text-ink-700 transition-[scale] active:scale-95"
            >
              <X className="size-5" />
            </button>
          </div>
        ) : (
          /* Brand header - clickable to return home */
          <Link
            href={ROUTES.HOME}
            className="block transition-opacity hover:opacity-80"
            title="Back to home"
          >
            <div className="relative overflow-hidden rounded-[1.5rem] bg-brand-aurora p-4">
              <div
                className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gold-200/40 blur-2xl"
                aria-hidden
              />
              <div className="relative flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-linear-to-br from-brand-700 to-brand-500 text-white shadow-elevated">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-brand-700">
                    {siteConfig.shortName}
                  </p>
                  <p className="truncate text-sm font-semibold text-ink-900">
                    {roleLabel}
                  </p>
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Navigation */}
        <nav
          aria-label={isDrawer ? `${roleLabel} navigation` : undefined}
          className={cn(
            "flex-1 overflow-y-auto overscroll-contain pb-2 scrollbar-thin",
            isDrawer ? "space-y-3 px-3" : "mt-3 space-y-4 px-1",
          )}
        >
          {/* Back to home (desktop keeps it at the top; the drawer has it in its footer) */}
          {isDrawer ? null : (
            <Link
              href={ROUTES.HOME}
              className={cn(
                rowBase,
                rowSize,
                "text-ink-700 transition-colors hover:bg-brand-50/80 hover:text-brand-800",
              )}
              title="Go back to the public site"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 group-hover:bg-white">
                <Home className="h-4 w-4" />
              </span>
              <span className="flex-1 truncate">Back to Home</span>
            </Link>
          )}

          {/* Grouped navigation sections */}
          {groups.map((group) => (
            <div key={group.section} className="space-y-1">
              <p className="px-3 pb-1 pt-2 text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                {group.section}
              </p>
              {group.items.map((item) => {
                const isActive = item.href === activeHref;
                const count = item.badge === "pending" ? pendingCount : 0;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={go(item.href)}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      rowBase,
                      rowSize,
                      "transition-[background-color,color,box-shadow]",
                      isActive
                        ? "bg-linear-to-r from-brand-700 to-brand-600 text-white shadow-elevated"
                        : "text-ink-700 hover:bg-brand-50/80 hover:text-brand-800",
                    )}
                  >
                    {isActive && (
                      <span
                        className={cn(
                          "absolute top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-gold-400",
                          isDrawer ? "left-0.5" : "-left-1",
                        )}
                        aria-hidden
                      />
                    )}
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors",
                        isActive
                          ? "bg-white/15 text-white"
                          : "bg-brand-50 text-brand-700 group-hover:bg-white",
                      )}
                    >
                      <NavIcon name={item.icon} className="h-4 w-4" />
                    </span>
                    <span className="flex-1 truncate">{item.label}</span>
                    {count > 0 && (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold leading-none",
                          isActive
                            ? "bg-white text-brand-700"
                            : "bg-gold-400 text-ink-900",
                        )}
                      >
                        {count}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        {isDrawer ? (
          <div className="shrink-0 space-y-2 border-t border-white/50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
            <div className="grid grid-cols-2 gap-2">
              <Link
                href={ROUTES.HOME}
                onClick={go(ROUTES.HOME)}
                className="btn-glass min-h-11"
              >
                <Home className="size-4" />
                Home
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="btn-glass min-h-11 text-danger"
              >
                <LogOut className="size-4" />
                Sign out
              </button>
            </div>
            <a
              href={`mailto:${siteConfig.contact.email}`}
              className="flex min-h-9 items-center justify-center truncate text-xs font-semibold text-brand-700"
            >
              Support: {siteConfig.contact.email}
            </a>
          </div>
        ) : (
          <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
            <div className="rounded-2xl bg-brand-50/70 p-3">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-brand-700">
                Need help?
              </p>
              <p className="mt-1 text-xs text-ink-600">
                Reach the support desk for any platform issues or escalations.
              </p>
              <a
                href={`mailto:${siteConfig.contact.email}`}
                className="mt-1 inline-flex min-h-8 items-center text-xs font-semibold text-brand-700 hover:text-brand-800"
              >
                {siteConfig.contact.email}
              </a>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-ink-700 transition-colors hover:bg-red-50 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-50 text-danger">
                <LogOut className="h-4 w-4" />
              </span>
              <span className="flex-1 text-left">Sign out</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

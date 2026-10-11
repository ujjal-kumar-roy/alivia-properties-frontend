"use client";

import { Boxes, ChevronRight, LayoutGrid, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { ROUTES } from "@/config/routes.config";
import { cn } from "@/lib/utils";
import { canOptimize } from "@/utils/image-host";
import { DEPT_ART } from "@/utils/marketplace-art";
import type { MarketplaceCategory } from "@/services/marketplace.service";

export type MegaMenuData = {
  departments: MarketplaceCategory[]; // DEPARTMENT level, pre-sorted
  categoriesByDepartment: Record<string, MarketplaceCategory[]>; // deptSlug -> CATEGORY[]
};

const HOVER_CLOSE_DELAY = 140;

function imageFor(
  node: MarketplaceCategory,
  fallbackDeptSlug?: string,
): string | null {
  return (
    node.image?.url ??
    node.iconUrl ??
    (node.level === "DEPARTMENT" ? DEPT_ART[node.slug] : null) ??
    (fallbackDeptSlug ? DEPT_ART[fallbackDeptSlug] : null) ??
    null
  );
}

/** Rounded thumbnail that degrades to a tinted icon on missing/broken image. */
function Thumb({
  src,
  className = "size-9",
}: {
  src: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <span
        className={cn(
          className,
          "flex shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600",
        )}
      >
        <Boxes aria-hidden="true" className="size-4" />
      </span>
    );
  }
  return (
    <span
      className={cn(
        className,
        "relative shrink-0 overflow-hidden rounded-lg bg-ink-100 ring-1 ring-border/50",
      )}
    >
      <Image
        src={src}
        alt=""
        fill
        sizes="44px"
        className="object-cover"
        unoptimized={!canOptimize(src)}
        onError={() => setFailed(true)}
      />
    </span>
  );
}

export function MarketplaceMegaMenu({ data }: { data: MegaMenuData }) {
  const { departments, categoriesByDepartment } = data;

  const [open, setOpen] = useState(false); // desktop panel
  const [drawerOpen, setDrawerOpen] = useState(false); // mobile drawer
  const [activeSlug, setActiveSlug] = useState(departments[0]?.slug ?? "");
  const [drilled, setDrilled] = useState<string | null>(null); // mobile: dept slug drilled into

  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function cancelClose() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }
  function scheduleClose() {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), HOVER_CLOSE_DELAY);
  }
  function openPanel() {
    cancelClose();
    if (!activeSlug && departments[0]) setActiveSlug(departments[0].slug);
    setOpen(true);
  }

  // Esc closes; lock body scroll while the mobile drawer is open.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setDrawerOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const activeDept =
    departments.find((d) => d.slug === activeSlug) ?? departments[0];
  const activeCategories = activeDept
    ? (categoriesByDepartment[activeDept.slug] ?? [])
    : [];

  const browseAllBtn = (
    <Link
      href={ROUTES.PROJECTS}
      className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-bold text-white shadow-md transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
    >
      <LayoutGrid aria-hidden="true" className="size-4" />
      Browse All Apartments
    </Link>
  );

  if (departments.length === 0) return null;

  return (
    <div
      className="relative"
      onMouseEnter={openPanel}
      onMouseLeave={scheduleClose}
    >
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="true"
        aria-expanded={open || drawerOpen}
        aria-label="All categories"
        onClick={() => {
          if (
            typeof window !== "undefined" &&
            window.matchMedia("(min-width: 768px)").matches
          ) {
            setOpen((v) => !v);
          } else {
            setDrawerOpen(true);
          }
        }}
        className="flex h-11 w-full items-center gap-2 rounded-md bg-gold-400 px-3 font-bold text-brand-950 shadow-md shadow-gold-200/70 transition-colors hover:bg-gold-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
      >
        <LayoutGrid aria-hidden="true" className="size-5" />
        <span className="hidden whitespace-nowrap sm:inline">All Categories</span>
      </button>

      {/* Desktop hover panel (md+) */}
      {open && (
        <div
          role="menu"
          aria-label="Marketplace categories"
          className="absolute left-0 top-[calc(100%+0.5rem)] z-50 hidden w-208 max-w-[calc(100vw-2rem)] grid-cols-[16rem_minmax(0,1fr)] overflow-hidden rounded-2xl border border-border/70 bg-white shadow-(--shadow-pop) md:grid"
        >
          {/* Left rail: departments (scroll) + browse button pinned to bottom */}
          <div className="flex max-h-120 min-h-96 flex-col border-r border-border/60 bg-ink-50/60">
            <ul className="flex-1 overflow-y-auto p-2">
            {departments.map((dept) => {
              const isActive = dept.slug === activeDept?.slug;
              return (
                <li key={dept.slug}>
                  <button
                    type="button"
                    role="menuitem"
                    onMouseEnter={() => setActiveSlug(dept.slug)}
                    onFocus={() => setActiveSlug(dept.slug)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm font-semibold transition-colors",
                      isActive
                        ? "bg-white text-brand-800 shadow-sm"
                        : "text-ink-700 hover:bg-white/70",
                    )}
                  >
                    <Thumb src={imageFor(dept)} className="size-9" />
                    <span className="min-w-0 flex-1 truncate">{dept.name}</span>
                    <ChevronRight
                      aria-hidden="true"
                      className="size-4 shrink-0 opacity-60"
                    />
                  </button>
                </li>
              );
            })}
            </ul>
            <div className="border-t border-border/60 p-3">{browseAllBtn}</div>
          </div>

          {/* Right panel: categories (with thumbnails) */}
          <div className="max-h-120 overflow-y-auto p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-base font-bold text-ink-900">
                {activeDept?.name}
              </h3>
              {activeDept && (
                <Link
                  href={ROUTES.MARKETPLACE_CATEGORY(activeDept.slug)}
                  className="text-xs font-semibold text-brand-700 hover:text-brand-900"
                >
                  See all in {activeDept.name}
                </Link>
              )}
            </div>
            {activeCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Browse {activeDept?.name} suppliers and products.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-3">
                {activeCategories.map((cat) => (
                  <div key={cat.slug} className="min-w-0">
                    <Link
                      href={ROUTES.MARKETPLACE_CATEGORY(cat.slug)}
                      className="group flex items-center gap-2.5"
                    >
                      <Thumb
                        src={imageFor(cat, activeDept?.slug)}
                        className="size-11"
                      />
                      <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink-900 transition-colors group-hover:text-brand-700">
                        {cat.name}
                      </span>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile drawer (below md) */}
      {drawerOpen &&
        createPortal(
          <div className="fixed inset-0 z-60 md:hidden">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => {
                setDrawerOpen(false);
                setDrilled(null);
              }}
              aria-hidden="true"
            />
            <div className="absolute inset-y-0 left-0 flex w-[88%] max-w-sm flex-col bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-border/60 p-4">
                <span className="text-base font-bold text-ink-900">
                  {drilled
                    ? departments.find((d) => d.slug === drilled)?.name
                    : "All Categories"}
                </span>
                <button
                  type="button"
                  aria-label="Close categories"
                  onClick={() => {
                    if (drilled) setDrilled(null);
                    else setDrawerOpen(false);
                  }}
                  className="flex size-9 items-center justify-center rounded-full text-ink-600 hover:bg-ink-100"
                >
                  <X aria-hidden="true" className="size-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto overscroll-contain p-2">
                {!drilled ? (
                  <ul>
                    {departments.map((dept) => (
                      <li key={dept.slug}>
                        <button
                          type="button"
                          onClick={() => setDrilled(dept.slug)}
                          className="flex min-h-12 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold text-ink-800 hover:bg-ink-50"
                        >
                          <Thumb src={imageFor(dept)} className="size-10" />
                          <span className="min-w-0 flex-1 truncate">
                            {dept.name}
                          </span>
                          <ChevronRight
                            aria-hidden="true"
                            className="size-4 opacity-60"
                          />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="space-y-4 p-2">
                    {(categoriesByDepartment[drilled] ?? []).map((cat) => (
                      <div key={cat.slug}>
                        <Link
                          href={ROUTES.MARKETPLACE_CATEGORY(cat.slug)}
                          onClick={() => setDrawerOpen(false)}
                          className="flex items-center gap-2.5 py-1"
                        >
                          <Thumb
                            src={imageFor(cat, drilled)}
                            className="size-10"
                          />
                          <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink-900">
                            {cat.name}
                          </span>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-border/60 p-4">
                {browseAllBtn}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

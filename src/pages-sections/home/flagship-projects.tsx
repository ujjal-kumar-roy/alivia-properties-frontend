"use client"

import { useMemo, useState, ViewTransition } from "react"
import Link from "next/link"
import Image from "next/image"
import { AnimatePresence, motion } from "motion/react"
import {
  ArrowUpRight,
  BedDouble,
  Building2,
  CalendarClock,
  Eye,
  Flame,
  Layers,
  MapPin,
  Maximize2,
  MessageCircle,
  Sparkles,
  Star,
} from "lucide-react"

import { CardFact } from "@/components/common/card-fact"
import { MorphLink } from "@/components/common/morph-placeholder"
import { ROUTES } from "@/config/routes.config"
import { haptic } from "@/lib/celebrate"
import { CARD_BLUR_DATA_URL } from "@/lib/image-placeholder"
import { springs } from "@/lib/motion"
import { isRecent } from "@/utils/format-date"
import type { FlagshipProject } from "@/utils/flagship-project"

export type { FlagshipProject } from "@/utils/flagship-project"

type Merch =
  | { kind: "low-stock"; label: string; short: string }
  | { kind: "featured"; label: string; short: string }
  | { kind: "new"; label: string; short: string }
  | null

function merchBadge(p: FlagshipProject): Merch {
  const { availableUnits: a, totalUnits: t } = p
  if (typeof a === "number" && typeof t === "number" && t > 0 && a > 0 && a / t <= 0.25) {
    return { kind: "low-stock", label: `Only ${a} unit${a === 1 ? "" : "s"} left`, short: `${a} left` }
  }
  if (p.isFeatured) return { kind: "featured", label: "Featured", short: "Featured" }
  if (isRecent(p.createdAt, 30)) return { kind: "new", label: "New launch", short: "New" }
  return null
}

const MERCH_STYLE: Record<string, string> = {
  "low-stock": "bg-red-600 text-white",
  featured: "bg-gold-400 text-brand-950",
  new: "bg-brand-700 text-white",
}

const MERCH_ICON = { "low-stock": Flame, featured: Star, new: Sparkles }

type Filter = "all" | "ongoing" | "upcoming" | "completed"

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "ongoing", label: "Ongoing" },
  { id: "upcoming", label: "Upcoming" },
  { id: "completed", label: "Completed" },
]

const STATUS_STYLE: Record<string, string> = {
  ongoing: "bg-blue-50 text-blue-700",
  upcoming: "bg-amber-50 text-amber-700",
  completed: "bg-emerald-50 text-emerald-700",
}

/**
 * Circular icon button shown over the card image. It lives in an overlay
 * that is a sibling of the card link (not nested), so the markup stays
 * valid. Collapsed it is a 44px white circle; on hover / keyboard focus
 * the label slides open to its left, turning it into a pill. `aria-label`
 * keeps it usable while collapsed. Tablet and up only: touch has no hover,
 * and phones get the whole card as one big tap target instead.
 */
function ImageCta({
  href,
  icon: Icon,
  label,
  morph,
}: {
  href: string
  icon: typeof Eye
  label: string
  /** The card photo's morph name, for a CTA that opens the detail page. */
  morph?: string
}) {
  return (
    <MorphLink
      href={href}
      morph={morph}
      aria-label={label}
      className="group/cta pointer-events-none flex h-11 items-center overflow-hidden rounded-full bg-white text-brand-700 shadow-[0_6px_20px_-4px_rgba(2,6,23,0.25)] outline-none transition-colors duration-200 hover:text-brand-800 focus-visible:ring-2 focus-visible:ring-brand-400 group-hover:pointer-events-auto group-focus-within:pointer-events-auto"
    >
      <span className="max-w-0 overflow-hidden whitespace-nowrap pl-4 text-sm font-semibold text-ink-900 opacity-0 transition-all duration-300 group-hover/cta:max-w-40 group-hover/cta:opacity-100 group-focus-visible/cta:max-w-40 group-focus-visible/cta:opacity-100">
        {label}
      </span>
      <span className="grid size-11 shrink-0 place-items-center">
        <Icon aria-hidden="true" className="h-5 w-5" />
      </span>
    </MorphLink>
  )
}

/**
 * The flagship apartment card. Self-contained `<article>` so it can be dropped
 * into any grid: the landing "Find your next landmark" section and the
 * /apartments listing both render it, keeping the two pages identical.
 *
 * Phones get a compact row (square thumbnail left, facts right, about 130px
 * tall) so a screen shows 5 to 6 projects; from `sm` it becomes the larger
 * vertical card with amenities and an availability bar.
 */
export function FlagshipProjectCard({ project: p }: { project: FlagshipProject }) {
  const merch = merchBadge(p)
  const MerchIcon = merch ? MERCH_ICON[merch.kind] : null
  const href = p.slug ? ROUTES.PROJECT_DETAIL(p.slug) : ROUTES.PROJECTS
  const morph = p.slug && p.cover ? `apartment-${p.slug}` : undefined
  const status = p.status.toLowerCase()
  const left = p.availableUnits ?? null
  const total = p.totalUnits ?? null
  const soldPct =
    left != null && total != null && total > 0
      ? Math.round(((total - left) / total) * 100)
      : null
  const amenities = p.amenities ?? []

  return (
    <article
      data-card
      className="group relative min-w-0 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-(--shadow-card) transition-[translate,scale,box-shadow] duration-200 active:scale-[0.99] sm:rounded-3xl sm:hover:-translate-y-1 sm:hover:shadow-(--shadow-elevated) motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100"
    >
      <MorphLink
        href={href}
        morph={morph}
        className="flex gap-2.5 rounded-[inherit] p-2 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-400 sm:block sm:p-0"
      >
        {/* Media: square thumbnail on phones, 16:10 image from sm. */}
        <div className="relative aspect-square w-25 shrink-0 self-start overflow-hidden rounded-xl bg-ink-100 sm:aspect-16/10 sm:w-full sm:self-auto sm:rounded-none">
          {p.cover ? (
            <ViewTransition name={morph} share="auto" default="none">
              <Image
                src={p.cover}
                alt={p.name}
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100px"
                placeholder="blur"
                blurDataURL={CARD_BLUR_DATA_URL}
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </ViewTransition>
          ) : (
            <div className="flex h-full items-center justify-center text-brand-200">
              <Building2 aria-hidden="true" className="h-8 w-8 sm:h-10 sm:w-10" />
            </div>
          )}

          <div className="absolute left-0 top-0 flex flex-col items-start gap-2 p-1.5 sm:p-3">
            <span
              className={
                "inline-flex rounded-full px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wide sm:px-2.5 sm:py-1 sm:tracking-wider " +
                (STATUS_STYLE[status] ?? "bg-white/90 text-ink-700")
              }
            >
              {p.status}
            </span>
            {merch && MerchIcon && (
              <span
                className={
                  "hidden items-center gap-1 rounded-full px-2.5 py-1 text-[0.6875rem] font-bold uppercase tracking-wider shadow-sm sm:inline-flex " +
                  MERCH_STYLE[merch.kind]
                }
              >
                <MerchIcon aria-hidden="true" className="h-3 w-3" />
                {merch.label}
              </span>
            )}
          </div>

          {merch && MerchIcon && (
            <span
              className={
                "absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 py-[3px] text-[0.6875rem] font-bold uppercase tracking-wide sm:hidden " +
                MERCH_STYLE[merch.kind]
              }
            >
              <MerchIcon aria-hidden="true" className="size-2.5" />
              {merch.short}
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col sm:p-4">
          <h3 className="line-clamp-1 font-heading text-[0.95rem] font-semibold leading-tight text-ink-900 transition-colors group-hover:text-brand-700 sm:text-lg">
            {p.name}
          </h3>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-500 sm:mt-1">
            <MapPin aria-hidden="true" className="size-3 shrink-0" />
            <span className="truncate">{p.location}</span>
          </p>

          <ul className="mt-1.5 flex flex-wrap gap-x-2.5 gap-y-0.5 sm:mt-2.5 sm:gap-x-3 sm:gap-y-1">
            {p.bedrooms && (
              <li>
                <CardFact icon={BedDouble}>{p.bedrooms}</CardFact>
              </li>
            )}
            {p.size && (
              <li>
                <CardFact icon={Maximize2}>{p.size}</CardFact>
              </li>
            )}
            {p.floors != null && (
              <li>
                <CardFact icon={Layers}>
                  {p.floors} Floor{p.floors === 1 ? "" : "s"}
                </CardFact>
              </li>
            )}
            {(status === "completed" || p.handover) && (
              <li>
                <CardFact icon={CalendarClock}>
                  {status === "completed" ? "Ready to move in" : `Handover ${p.handover}`}
                </CardFact>
              </li>
            )}
          </ul>

          {/* Tablet and up: amenities, developer, and a real availability bar. */}
          {amenities.length > 0 && (
            <ul className="mt-3 hidden flex-wrap gap-1.5 sm:flex">
              {amenities.slice(0, 3).map((a) => (
                <li
                  key={a}
                  className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800"
                >
                  {a}
                </li>
              ))}
              {amenities.length > 3 && (
                <li className="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-semibold text-ink-600">
                  +{amenities.length - 3}
                </li>
              )}
            </ul>
          )}
          {soldPct != null && left != null && total != null && (
            <div className="mt-3 hidden sm:block">
              <div className="flex items-center justify-between text-xs font-semibold text-ink-600">
                <span>
                  {left} of {total} units available
                </span>
                {p.views ? (
                  <span className="inline-flex items-center gap-1 font-medium text-ink-500">
                    <Eye aria-hidden="true" className="size-3" />
                    {p.views.toLocaleString("en-BD")} views
                  </span>
                ) : null}
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-100">
                <div
                  className="h-full rounded-full bg-gold-400"
                  style={{ width: `${Math.max(soldPct, 4)}%` }}
                />
              </div>
            </div>
          )}
          {p.developer && (
            <p className="mt-2.5 hidden text-xs text-ink-500 sm:block">by {p.developer}</p>
          )}

          <div className="mt-auto flex items-end justify-between gap-2 pt-1.5 sm:mt-3 sm:items-center sm:border-t sm:border-border/60 sm:pt-3">
            <div className="min-w-0">
              {p.price ? (
                <>
                  <p className="hidden text-[0.6875rem] uppercase tracking-wider text-ink-500 sm:block">
                    {p.priceIsRange ? "Price range" : "Starting from"}
                  </p>
                  <p className="truncate text-[0.95rem] font-extrabold leading-tight tabular-nums text-gold-700 sm:text-base">
                    {!p.priceIsRange && (
                      <span className="mr-1 text-xs font-semibold text-ink-500 sm:hidden">From</span>
                    )}
                    {p.price}
                  </p>
                </>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-ink-500">
                  <Layers aria-hidden="true" className="h-3.5 w-3.5" />
                  {p.units ?? "Details inside"}
                </span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {left != null && left > 0 && (
                <span className="text-xs font-bold text-amber-700 sm:hidden">{left} left</span>
              )}
              <span className="hidden size-8 items-center justify-center rounded-full bg-brand-50 text-brand-700 transition-colors group-hover:bg-brand-700 group-hover:text-white sm:flex">
                <ArrowUpRight aria-hidden="true" className="size-4" />
              </span>
            </div>
          </div>
        </div>
      </MorphLink>

      {/* Action buttons over the image (hover / keyboard focus, tablet and up).
          Pure CSS (group-hover), so hovering never re-renders. */}
      <div className="pointer-events-none absolute right-3 top-3 z-10 hidden flex-col items-end gap-2.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100 sm:flex motion-reduce:transition-none">
        <ImageCta href={href} icon={Eye} label="View Details" morph={morph} />
        <ImageCta
          href={p.slug ? `${ROUTES.PROJECT_DETAIL(p.slug)}#enquire` : ROUTES.CONTACT}
          icon={MessageCircle}
          label="Contact Seller"
        />
      </div>
    </article>
  )
}

export function FlagshipProjects({ projects }: { projects: FlagshipProject[] }) {
  const [filter, setFilter] = useState<Filter>("all")

  const filtered = useMemo(
    () =>
      filter === "all"
        ? projects
        : projects.filter((p) => p.status.toLowerCase() === filter),
    [projects, filter],
  )

  return (
    <section className="container-page py-6 sm:py-10 md:py-14">
      <header className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-eyebrow mb-1">Explore Alivia</p>
            <h2 className="text-balance font-heading text-2xl font-bold uppercase leading-tight tracking-tight text-brand-950 sm:text-4xl">
              Find your next <span className="text-gold-600">landmark.</span>
            </h2>
            <p className="mt-1.5 max-w-xl text-[0.8125rem] leading-5 text-ink-600 sm:mt-2 sm:text-sm sm:leading-6">
              Browse ongoing, upcoming, and completed Alivia projects.
            </p>
          </div>

          {/* Phones: the "see everything" link sits beside the title. */}
          <Link
            href={ROUTES.PROJECTS}
            className="-mr-1 inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full px-2 text-sm font-semibold text-brand-700 transition-colors hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 sm:hidden"
          >
            View all
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <div
            role="group"
            aria-label="Filter projects by status"
            className="flex flex-1 items-center gap-1 overflow-x-auto rounded-2xl border border-ink-100 bg-ink-50/80 p-1 scrollbar-none sm:flex-none"
          >
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={filter === f.id}
                onClick={() => {
                  if (filter === f.id) return
                  haptic("tap")
                  setFilter(f.id)
                }}
                className={
                  "relative min-h-9 flex-1 whitespace-nowrap rounded-xl px-3.5 text-xs font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 sm:flex-none " +
                  (filter === f.id ? "text-white" : "text-ink-600 hover:text-ink-900")
                }
              >
                {filter === f.id && (
                  <motion.span
                    layoutId="flagship-filter-pill"
                    transition={springs.move}
                    className="absolute inset-0 rounded-xl bg-brand-700 shadow-sm"
                  />
                )}
                <span className="relative z-10">{f.label}</span>
              </button>
            ))}
          </div>

          <Link
            href={ROUTES.PROJECTS}
            className="hidden min-h-11 items-center gap-1.5 rounded-2xl bg-brand-700 px-4 text-xs font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 sm:inline-flex"
          >
            View all apartments
            <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 bg-white px-5 py-8 text-center shadow-sm sm:px-8">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <Building2 aria-hidden="true" className="size-5" />
          </div>
          <h3 className="mt-4 font-heading text-xl font-semibold text-brand-950">
            Apartments are being prepared
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-600">
            We are updating this gallery with current Alivia developments. Open
            the full projects page to browse every available listing.
          </p>
          <Link
            href={ROUTES.PROJECTS}
            className="btn-tactile btn-tactile--sm mt-5"
          >
            View projects
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      ) : (
        <ul className="relative grid gap-2.5 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          <AnimatePresence mode="popLayout" initial={false}>
            {filtered.map((p) => (
              <motion.li
                key={p.slug || p.name}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={springs.move}
                className="min-w-0"
              >
                {/* .reveal sets its own transform, so it sits inside the layout item. */}
                <div className="reveal">
                  <FlagshipProjectCard project={p} />
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  )
}

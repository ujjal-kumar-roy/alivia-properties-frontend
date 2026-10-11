"use client"

import { Button } from "@/components/ui/button"
import { ROUTES } from "@/config/routes.config"
import {
  LS_RECENT_SEARCHES,
  LS_SAVED_PROPERTIES,
} from "@/lib/constants"
import type { Buyer } from "@/types/user.types"
import {
  Bookmark,
  CalendarCheck,
  History,
  MessageSquare,
  Search,
  Clock,
  ArrowRight,
} from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

type StatTile = {
  icon: typeof Bookmark
  label: string
  value: number
  href: string
  tone: string
}

function StatTile({ icon: Icon, label, value, href, tone }: StatTile) {
  return (
    <Link
      href={href}
      className="surface-card group flex flex-col items-start gap-2 p-3 transition-[translate,box-shadow,scale] active:scale-[0.98] hover:-translate-y-1 hover:shadow-elevated sm:flex-row sm:items-center sm:gap-4 sm:p-4"
    >
      <div
        className={`flex size-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br sm:size-12 sm:rounded-2xl ${tone}`}
      >
        <Icon className="size-4 sm:size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-500 sm:tracking-[0.18em]">
          {label}
        </p>
        <p className="mt-0.5 text-2xl font-bold tabular-nums tracking-tight text-ink-900 sm:mt-1">
          {value}
        </p>
      </div>
    </Link>
  )
}

export function BuyerDashboardLocalView({
  buyer,
  inquiryCount,
  bookingCount,
  savedCountFromApi = 0,
}: {
  buyer: Buyer
  inquiryCount: number
  bookingCount: number
  savedCountFromApi?: number
}) {
  const [savedCount, setSavedCount] = useState(0)
  const [recentCount, setRecentCount] = useState(0)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_SAVED_PROPERTIES) ?? "[]")
      const recent = JSON.parse(localStorage.getItem(LS_RECENT_SEARCHES) ?? "[]")
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSavedCount(Array.isArray(saved) ? saved.length : 0)
      setRecentCount(Array.isArray(recent) ? recent.length : 0)
    } catch {
      // localStorage unavailable — leave counts at 0
    }
  }, [])

  const firstName = buyer.name?.split(" ")[0] ?? "there"

  return (
    <div className="mt-3 space-y-4 sm:mt-6 sm:space-y-6">
      <section className="surface-panel relative overflow-hidden p-4 sm:p-7">
        <div className="absolute inset-0 bg-brand-aurora" aria-hidden />
        <div className="relative">
          <p className="hidden text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-brand-700 sm:block">
            Welcome back
          </p>
          <h2 className="text-xl font-bold tracking-tight text-ink-900 sm:mt-2 sm:text-3xl">
            Hi {firstName} 👋
          </h2>
          <p className="mt-1 max-w-xl text-[0.8125rem] leading-snug text-ink-600 sm:mt-1.5 sm:text-sm">
            Pick up where you left off: browse saved properties, revisit recent
            searches, or check on your latest inquiries.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-4">
            <Link href={ROUTES.PROPERTIES} className="btn-tactile btn-tactile--sm">
              <Search className="size-4" />
              Browse Properties
            </Link>
            <Link href={ROUTES.CONSULTATION} className="btn-glass">
              Book Consultation
            </Link>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4">
        <StatTile
          icon={Bookmark}
          label="Saved Properties"
          value={Math.max(savedCount, savedCountFromApi)}
          href={ROUTES.BUYER_SAVED}
          tone="from-brand-100 to-brand-50 text-brand-800"
        />
        <StatTile
          icon={History}
          label="Recent Searches"
          value={recentCount}
          href={ROUTES.BUYER_SEARCHES}
          tone="from-sky-100 to-sky-50 text-sky-800"
        />
        <StatTile
          icon={MessageSquare}
          label="My Inquiries"
          value={inquiryCount}
          href={ROUTES.BUYER_INQUIRIES}
          tone="from-amber-100 to-amber-50 text-amber-800"
        />
        <StatTile
          icon={CalendarCheck}
          label="My Bookings"
          value={bookingCount}
          href={ROUTES.BUYER_BOOKINGS}
          tone="from-emerald-100 to-emerald-50 text-emerald-800"
        />
      </div>
    </div>
  )
}

// ─── RecentSearchesView ────────────────────────────────────────────────────────

export function RecentSearchesView({ fallbackItems }: { fallbackItems?: string[] }) {
  const [items, setItems] = useState<string[]>([])

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(LS_RECENT_SEARCHES) ?? "[]")
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setItems(Array.isArray(stored) ? stored : (fallbackItems ?? []))
    } catch {
      setItems(fallbackItems ?? [])
    }
  }, [fallbackItems])

  if (items.length === 0) {
    return (
      <div className="mt-3 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-12 text-center sm:mt-6 sm:py-16">
        <History className="mb-3 h-8 w-8 text-ink-300" />
        <p className="text-sm font-medium text-ink-700">No recent searches</p>
        <p className="mt-1 text-xs text-ink-500">Your search history will appear here.</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4 rounded-full max-sm:h-9"
          render={<Link href={ROUTES.PROPERTIES} />}
        >
          <Search className="mr-2 h-3.5 w-3.5" /> Browse Listings
        </Button>
      </div>
    )
  }

  return (
    <div className="mt-3 space-y-2 sm:mt-6">
      {items.map((q, i) => (
        <Link
          key={i}
          href={`${ROUTES.PROPERTIES}?search=${encodeURIComponent(q)}`}
          className="flex min-h-12 items-center gap-3 rounded-xl border border-border bg-white px-4 py-3 transition-[background-color,border-color,scale] active:scale-[0.99] hover:border-brand-300 hover:bg-brand-50"
        >
          <Clock className="h-4 w-4 shrink-0 text-ink-400" />
          <span className="flex-1 truncate text-sm text-ink-800">{q}</span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-ink-400" />
        </Link>
      ))}
    </div>
  )
}

// ─── SavedPropertiesView ───────────────────────────────────────────────────────

export function SavedPropertiesView({ fallbackIds }: { fallbackIds?: string[] }) {
  const [ids, setIds] = useState<string[]>([])

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(LS_SAVED_PROPERTIES) ?? "[]")
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIds(Array.isArray(stored) ? stored : (fallbackIds ?? []))
    } catch {
      setIds(fallbackIds ?? [])
    }
  }, [fallbackIds])

  if (ids.length === 0) {
    return (
      <div className="mt-3 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-12 text-center sm:mt-6 sm:py-16">
        <Bookmark className="mb-3 h-8 w-8 text-ink-300" />
        <p className="text-sm font-medium text-ink-700">No saved properties</p>
        <p className="mt-1 text-xs text-ink-500">Heart a listing to save it here.</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4 rounded-full max-sm:h-9"
          render={<Link href={ROUTES.PROPERTIES} />}
        >
          <Search className="mr-2 h-3.5 w-3.5" /> Browse Listings
        </Button>
      </div>
    )
  }

  return (
    <div className="mt-3 sm:mt-6">
      <p className="mb-3 text-xs text-ink-500 sm:mb-4">{ids.length} saved listing{ids.length !== 1 ? "s" : ""}</p>
      <div className="grid gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
        {ids.map((id) => (
          <div key={id} className="flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-3">
            <Bookmark className="h-4 w-4 shrink-0 text-brand-600" />
            <span className="flex-1 truncate text-xs text-ink-600 font-mono">{id}</span>
            <Link href={ROUTES.PROPERTIES} className="shrink-0">
              <ArrowRight className="h-3.5 w-3.5 text-ink-400 hover:text-brand-700" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}

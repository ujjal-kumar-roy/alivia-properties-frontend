export const dynamic = "force-dynamic"

import Link from "next/link"
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarCheck,
  CircleDollarSign,
  Clock3,
  Flag,
  Home,
  MessageSquare,
  PlusCircle,
  Users,
} from "lucide-react"
import { auth } from "@/auth"
import { getDashboardStats } from "@/services/dashboard.service"
import { StatCard } from "@/components/dashboard/stat-card"
import { AdminDashboardCharts, AdminInsightsCharts } from "@/pages-sections/admin/admin-views"
import { ROUTES } from "@/config/routes.config"

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

const QUICK_ACTIONS = [
  {
    label: "Add Apartment",
    description: "Showcase a new Alivia development.",
    href: ROUTES.ADMIN_PROJECTS,
    icon: PlusCircle,
    tone: "from-brand-100 to-brand-50 text-brand-800",
  },
  {
    label: "Active Inquiries",
    description: "Reply to leads waiting on a response.",
    href: ROUTES.ADMIN_INQUIRIES,
    icon: MessageSquare,
    tone: "from-sky-100 to-sky-50 text-sky-800",
  },
  {
    label: "Open Reports",
    description: "Resolve listing complaints from users.",
    href: ROUTES.ADMIN_REPORTS,
    icon: Flag,
    tone: "from-rose-100 to-rose-50 text-rose-800",
  },
] as const

export default async function AdminDashboardPage() {
  const session = await auth()
  const dashboard = await getDashboardStats()
  const { stats, monthlyListings, inquiryByType, monthlyBookings, propertyStatusByQuarter, recentActivity } = dashboard.data

  const firstName = session?.user?.name?.split(" ")[0] ?? "Admin"
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Greeting hero */}
      <section className="surface-panel relative overflow-hidden p-4 sm:p-7">
        <div className="absolute inset-0 bg-brand-aurora" aria-hidden />
        <div className="pointer-events-none absolute -right-20 -top-24 hidden h-64 w-64 rounded-full bg-gold-200/30 blur-3xl sm:block" aria-hidden />
        <div className="pointer-events-none absolute -left-16 bottom-0 hidden h-48 w-48 rounded-full bg-brand-200/30 blur-3xl sm:block" aria-hidden />
        <div className="relative flex flex-col gap-3 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="hidden text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-brand-700 sm:block">
              {today}
            </p>
            <h1 className="text-xl font-bold tracking-tight text-ink-900 sm:mt-2 sm:text-3xl">
              {getGreeting()}, {firstName} 👋
            </h1>
            <p className="mt-1 max-w-xl text-[0.8125rem] leading-snug text-ink-600 sm:mt-1.5 sm:text-base">
              Here&apos;s what&apos;s happening across the Alivia marketplace today.
              You have{" "}
              <span className="font-semibold text-brand-800">
                {stats.pendingListings} pending listing{stats.pendingListings === 1 ? "" : "s"}
              </span>{" "}
              waiting for review.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={ROUTES.ADMIN_PROJECTS}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-ink-900 px-4 text-sm font-semibold text-white transition-[background-color,scale] hover:bg-ink-800 active:scale-[0.98] sm:h-10"
            >
              Manage apartments
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4">
        <StatCard
          icon={Home}
          tone="brand"
          label="Total Properties"
          value={stats.totalProperties}
          trend={8}
          hint="vs. last 30 days"
        />
        <StatCard
          icon={Clock3}
          tone="warning"
          label="Pending Listings"
          value={stats.pendingListings}
          hint="Awaiting your review"
        />
        <StatCard
          icon={Users}
          tone="info"
          label="Total Users"
          value={stats.totalUsers}
          trend={4}
          hint="Across all roles"
        />
        <StatCard
          icon={MessageSquare}
          tone="success"
          label="Total Inquiries"
          value={stats.totalInquiries}
          trend={12}
          hint="All time"
        />
        <StatCard
          icon={CalendarCheck}
          tone="brand"
          label="Total Bookings"
          value={stats.totalBookings}
          hint="Consultations &amp; site visits"
        />
        <StatCard
          icon={BadgeCheck}
          tone="success"
          label="Verified Listings"
          value={stats.verifiedListings}
          hint="Trusted inventory"
        />
        <StatCard
          icon={Building2}
          tone="info"
          label="Total Sellers"
          value={stats.totalSellers}
          hint="Active sellers"
        />
        <StatCard
          icon={CircleDollarSign}
          tone="gold"
          label="Revenue"
          value="—"
          hint="Billing not configured"
        />
      </div>

      {/* Quick actions */}
      <section>
        <div className="mb-2 flex items-end justify-between sm:mb-3">
          <div>
            <p className="hidden text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-brand-700 sm:block">
              Quick actions
            </p>
            <h2 className="text-base font-semibold text-ink-900 sm:mt-1 sm:text-lg">
              Jump back into your workflow
            </h2>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-4">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="surface-card group flex min-w-0 items-center gap-3 p-3 transition-[translate,box-shadow,scale] active:scale-[0.99] hover:-translate-y-1 hover:shadow-elevated sm:gap-4 sm:p-4"
            >
              <div
                className={`flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br sm:size-12 sm:rounded-2xl ${action.tone}`}
              >
                <action.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink-900">
                  {action.label}
                </p>
                <p className="truncate text-xs text-ink-500">{action.description}</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-ink-400 transition-transform group-hover:translate-x-1 group-hover:text-brand-700" />
            </Link>
          ))}
        </div>
      </section>

      {/* Charts + activity */}
      <AdminDashboardCharts
        monthlyListings={monthlyListings}
        inquiryByType={inquiryByType}
        recentActivity={recentActivity}
      />

      {/* Second chart row — bookings trend + listing health */}
      <AdminInsightsCharts
        monthlyBookings={monthlyBookings}
        propertyStatusByQuarter={propertyStatusByQuarter}
      />
    </div>
  )
}

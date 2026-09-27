"use client"

import { DataTable, type DataTableColumn } from "@/components/dashboard/data-table"
import { ListingStatusBadge } from "@/components/dashboard/listing-status-badge"
import { InquiryStatusBadge } from "@/components/dashboard/inquiry-status-badge"
import { BookingStatusBadge } from "@/components/dashboard/booking-status-badge"
import { Button } from "@/components/ui/button"
import { ROUTES } from "@/config/routes.config"
import { cn } from "@/lib/utils"
import type {
  ActivityItem,
  ChartDataPoint,
  PropertyStatusPoint,
} from "@/types/dashboard.types"
import type { Property, PropertyStatus } from "@/types/property.types"
import type { Project, ProjectStatus } from "@/types/project.types"
import type { Seller, User } from "@/types/user.types"
import type { Inquiry, InquiryStatus, InquiryType } from "@/types/inquiry.types"
import type { Booking, BookingStatus } from "@/types/booking.types"
import { blogService, type BlogPost } from "@/services/blog.service"
import { useUrlFilter } from "@/hooks/use-url-filter"
import type { Report, ReportStatus } from "@/data/dummy-reports"
import type { Buyer } from "@/types/user.types"
import {
  BadgeCheck,
  ShieldAlert,
  Eye,
  EyeOff,
  Check,
  X,
  Star,
  Trash2,
  Loader2,
  ShieldCheck,
  AlertCircle,
  Pencil,
  CheckCircle2,
} from "lucide-react"
import { formatDate } from "@/utils/format-date"
import { formatPrice, formatRent } from "@/utils/format-price"
import { useSession } from "next-auth/react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { ApiError } from "@/services/http-client"
import { propertiesService } from "@/services/properties.service"
import { projectsService } from "@/services/projects.service"
import { updateSettings } from "@/services/settings.service"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

const BRAND = "#0d9488"
const GOLD = "#f59e0b"
const PIE_COLORS = ["#0d9488", "#f59e0b", "#0ea5e9", "#a855f7", "#ef4444", "#22c55e"]

function ChartCard({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="surface-card p-5">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
          {hint ? <p className="text-xs text-ink-500">{hint}</p> : null}
        </div>
      </div>
      <div className="h-64">{children}</div>
    </div>
  )
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border/60 text-xs text-ink-500">
      {label}
    </div>
  )
}

export function AdminDashboardCharts({
  monthlyListings,
  inquiryByType,
  recentActivity,
}: {
  monthlyListings: ChartDataPoint[]
  inquiryByType: ChartDataPoint[]
  recentActivity: ActivityItem[]
}) {
  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <ChartCard title="Listings per month" hint="Last 12 months">
          {monthlyListings.length === 0 ? (
            <EmptyChart label="No listing data yet" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyListings}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill={BRAND} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <ChartCard title="Inquiries by type" hint="All time">
        {inquiryByType.length === 0 ? (
          <EmptyChart label="No inquiry data yet" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={inquiryByType}
                dataKey="value"
                nameKey="label"
                innerRadius={45}
                outerRadius={80}
                paddingAngle={2}
              >
                {inquiryByType.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <div className="lg:col-span-3">
        <div className="surface-card p-5">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h3 className="text-sm font-semibold text-ink-900">
                Recent activity
              </h3>
              <p className="text-xs text-ink-500">
                Latest events across the platform
              </p>
            </div>
          </div>
          {recentActivity.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 p-6 text-center text-xs text-ink-500">
              No recent activity
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {recentActivity.slice(0, 8).map((a) => (
                <li key={a.id} className="flex items-start gap-3 py-2.5">
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-600" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-900">
                      {a.title}
                    </p>
                    <p className="truncate text-xs text-ink-500">
                      {a.description}
                    </p>
                  </div>
                  <time className="shrink-0 text-[0.7rem] text-ink-400">
                    {new Date(a.timestamp).toLocaleDateString()}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}

export function AdminInsightsCharts({
  monthlyBookings,
  propertyStatusByQuarter,
}: {
  monthlyBookings: ChartDataPoint[]
  propertyStatusByQuarter: PropertyStatusPoint[]
}) {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <ChartCard title="Bookings trend" hint="Monthly consultations &amp; site visits">
        {monthlyBookings.length === 0 ? (
          <EmptyChart label="No booking data yet" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyBookings}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="value"
                stroke={GOLD}
                strokeWidth={2}
                dot={{ r: 3, fill: GOLD }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Listing health by quarter" hint="Pending / approved / verified">
        {propertyStatusByQuarter.length === 0 ? (
          <EmptyChart label="No status data yet" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={propertyStatusByQuarter}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="pending" stackId="a" fill="#f59e0b" />
              <Bar dataKey="approved" stackId="a" fill="#0ea5e9" />
              <Bar dataKey="verified" stackId="a" fill={BRAND} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </section>
  )
}

const STATUS_FILTERS: { value: PropertyStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "verified", label: "Verified" },
  { value: "featured", label: "Featured" },
  { value: "rejected", label: "Rejected" },
]

export function AdminPropertiesTable({
  properties,
  status = "all",
  hideFilters = false,
}: {
  properties: Property[]
  status?: PropertyStatus | "all"
  hideFilters?: boolean
}) {
  const { data: session } = useSession()
  const token = session?.accessToken
  const setFilter = useUrlFilter()

  const [rows, setRows] = useState<Property[]>(properties)
  // id of the row currently running a mutation (disables its action buttons)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // reject + delete both need a confirmation dialog
  const [rejectTarget, setRejectTarget] = useState<Property | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<Property | null>(null)

  function applyUpdate(updated: Property) {
    setRows((current) => current.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)))
  }

  function reportError(err: unknown, fallback: string) {
    setError(
      err instanceof ApiError
        ? err.message
        : err instanceof Error
          ? err.message
          : fallback,
    )
  }

  async function runAction(
    id: string,
    action: () => Promise<Property>,
    fallback: string,
  ) {
    setBusyId(id)
    setError(null)
    try {
      applyUpdate(await action())
    } catch (err) {
      reportError(err, fallback)
    } finally {
      setBusyId(null)
    }
  }

  function approve(p: Property) {
    return runAction(
      p.id,
      () => propertiesService.approve(p.id, token),
      "Could not approve this listing.",
    )
  }

  function toggleVerify(p: Property) {
    const next = !(p.isVerified || p.status === "verified")
    return runAction(
      p.id,
      () => propertiesService.verify(p.id, next, token),
      "Could not update verification.",
    )
  }

  function toggleFeature(p: Property) {
    const next = !(p.isFeatured || p.status === "featured")
    return runAction(
      p.id,
      () => propertiesService.feature(p.id, next, token),
      "Could not update featured flag.",
    )
  }

  async function confirmReject() {
    if (!rejectTarget) return
    const reason = rejectReason.trim()
    if (reason.length < 3) {
      setError("Please provide a rejection reason (min 3 characters).")
      return
    }
    const target = rejectTarget
    await runAction(
      target.id,
      () => propertiesService.reject(target.id, reason, token),
      "Could not reject this listing.",
    )
    setRejectTarget(null)
    setRejectReason("")
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const target = deleteTarget
    setBusyId(target.id)
    setError(null)
    try {
      await propertiesService.remove(target.id, token)
      setRows((current) => current.filter((p) => p.id !== target.id))
      setDeleteTarget(null)
    } catch (err) {
      reportError(err, "Could not delete this listing.")
    } finally {
      setBusyId(null)
    }
  }

  const columns: DataTableColumn<Property>[] = [
    {
      key: "title",
      header: "Listing",
      primaryOnMobile: true,
      render: (p) => (
        <div className="min-w-0">
          <Link
            href={ROUTES.PROPERTY_DETAIL(p.slug)}
            className="block truncate font-semibold text-ink-900 hover:text-brand-700"
          >
            {p.title}
          </Link>
          <p className="mt-0.5 truncate text-xs text-ink-500">
            {p.area}, {p.district}
          </p>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      hideOnMobile: true,
      render: (p) => (
        <span className="text-xs font-medium uppercase tracking-wide text-ink-600">
          {p.type}
        </span>
      ),
    },
    {
      key: "purpose",
      header: "Purpose",
      hideOnMobile: true,
      render: (p) => (
        <span className="text-xs font-medium capitalize text-ink-600">
          {p.purpose}
        </span>
      ),
    },
    {
      key: "price",
      header: "Price",
      render: (p) => (
        <span className="text-sm font-semibold text-brand-700">
          {p.purpose === "rent" ? formatRent(p.price) : formatPrice(p.price, true)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (p) => <ListingStatusBadge status={p.status} />,
    },
    {
      key: "date",
      header: "Submitted",
      hideOnMobile: true,
      render: (p) => (
        <span className="text-xs text-ink-500">
          {p.createdAt ? formatDate(p.createdAt) : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (p) => {
        const busy = busyId === p.id
        const isVerified = p.isVerified || p.status === "verified"
        const isFeatured = p.isFeatured || p.status === "featured"
        const canApprove = p.status === "pending" || p.status === "rejected"
        const canReject = p.status !== "rejected"
        return (
          <div className="flex items-center justify-end gap-1">
            <Link href={ROUTES.PROPERTY_DETAIL(p.slug)} title="View listing">
              <Button
                size="icon"
                variant="outline"
                className="size-8 rounded-full"
                aria-label="View listing"
              >
                <Eye className="size-3.5" />
              </Button>
            </Link>

            {canApprove ? (
              <Button
                size="icon"
                variant="outline"
                disabled={busy}
                onClick={() => approve(p)}
                title="Approve"
                aria-label="Approve listing"
                className="size-8 rounded-full border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              >
                {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
              </Button>
            ) : null}

            <Button
              size="icon"
              variant="outline"
              disabled={busy}
              onClick={() => toggleVerify(p)}
              title={isVerified ? "Remove verification" : "Verify"}
              aria-label={isVerified ? "Remove verification" : "Verify listing"}
              className={cn(
                "size-8 rounded-full",
                isVerified
                  ? "border-brand-300 bg-brand-50 text-brand-700"
                  : "border-border/70 text-ink-600 hover:bg-brand-50",
              )}
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" />}
            </Button>

            <Button
              size="icon"
              variant="outline"
              disabled={busy}
              onClick={() => toggleFeature(p)}
              title={isFeatured ? "Unfeature" : "Feature"}
              aria-label={isFeatured ? "Unfeature listing" : "Feature listing"}
              className={cn(
                "size-8 rounded-full",
                isFeatured
                  ? "border-gold-300 bg-gold-50 text-gold-700"
                  : "border-border/70 text-ink-600 hover:bg-gold-50",
              )}
            >
              {busy ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Star className={cn("size-3.5", isFeatured && "fill-gold-400")} />
              )}
            </Button>

            {canReject ? (
              <Button
                size="icon"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setRejectTarget(p)
                  setRejectReason("")
                  setError(null)
                }}
                title="Reject"
                aria-label="Reject listing"
                className="size-8 rounded-full border-amber-200 text-amber-700 hover:bg-amber-50"
              >
                <X className="size-3.5" />
              </Button>
            ) : null}

            <Button
              size="icon"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setDeleteTarget(p)
                setError(null)
              }}
              title="Delete"
              aria-label="Delete listing"
              className="size-8 rounded-full border-red-200 text-red-600 hover:bg-red-50"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-4">
      {hideFilters ? null : (
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter("status", f.value)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                status === f.value
                  ? "border-brand-700 bg-brand-700 text-white"
                  : "border-border/70 bg-white text-ink-700 hover:bg-brand-50",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {error ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <DataTable
        columns={columns}
        data={rows}
        rowKey={(p) => p.id}
        emptyMessage="No listings match this filter."
      />

      {/* Reject dialog */}
      <Dialog
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => {
          if (!open && busyId === null) {
            setRejectTarget(null)
            setRejectReason("")
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject listing</DialogTitle>
            <DialogDescription>
              {rejectTarget
                ? `Tell the seller why "${rejectTarget.title}" was rejected. They will see this reason.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={4}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            disabled={busyId !== null}
            maxLength={500}
            placeholder="e.g. Images are low quality, price seems unrealistic, missing documents…"
            className="resize-y bg-white text-sm"
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busyId !== null}
              onClick={() => {
                setRejectTarget(null)
                setRejectReason("")
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={busyId !== null}
              onClick={confirmReject}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {busyId !== null ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Rejecting
                </>
              ) : (
                <>
                  <X className="size-4" /> Reject listing
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && busyId === null) setDeleteTarget(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete listing</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `This permanently removes "${deleteTarget.title}". This action cannot be undone.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busyId !== null}
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={busyId !== null}
              onClick={confirmDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {busyId !== null ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Deleting
                </>
              ) : (
                <>
                  <Trash2 className="size-4" /> Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function AdminSellersTable({
  sellers,
  verified = "all",
}: {
  sellers: Seller[]
  verified?: "all" | "true" | "false"
}) {
  const setFilter = useUrlFilter()

  const columns: DataTableColumn<Seller>[] = [
    {
      key: "seller",
      header: "Seller",
      primaryOnMobile: true,
      render: (s) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink-900">{s.name}</p>
          <p className="mt-0.5 truncate text-xs text-ink-500">{s.email}</p>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      hideOnMobile: true,
      render: (s) => (
        <span className="text-xs text-ink-600">{s.phone ?? "—"}</span>
      ),
    },
    {
      key: "verified",
      header: "Status",
      render: (s) =>
        s.isVerified ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
            <BadgeCheck className="h-3 w-3" />
            Verified
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
            <ShieldAlert className="h-3 w-3" />
            Pending
          </span>
        ),
    },
    {
      key: "joined",
      header: "Joined",
      hideOnMobile: true,
      render: (s) => (
        <span className="text-xs text-ink-500">
          {s.createdAt ? formatDate(s.createdAt) : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (s) => (
        <Link href={ROUTES.ADMIN_USER_DETAIL(s.id)}>
          <Button size="sm" variant="outline" className="rounded-full">
            View
          </Button>
        </Link>
      ),
    },
  ]

  const filters: { value: "all" | "true" | "false"; label: string }[] = [
    { value: "all", label: "All" },
    { value: "true", label: "Verified" },
    { value: "false", label: "Pending verification" },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter("verified", f.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
              verified === f.value
                ? "border-brand-700 bg-brand-700 text-white"
                : "border-border/70 bg-white text-ink-700 hover:bg-brand-50",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      <DataTable
        columns={columns}
        data={sellers}
        rowKey={(s) => s.id}
        emptyMessage="No sellers match this filter."
      />
    </div>
  )
}

type UserRow = User & { roleLabel: "Admin" | "Seller" | "Buyer" }

const ROLE_BADGE_STYLES: Record<UserRow["roleLabel"], string> = {
  Admin: "border-purple-200 bg-purple-50 text-purple-700",
  Seller: "border-blue-200 bg-blue-50 text-blue-700",
  Buyer: "border-emerald-200 bg-emerald-50 text-emerald-700",
}

export function AdminUsersTable({
  users,
  role = "all",
}: {
  users: UserRow[]
  role?: "all" | "admin" | "seller" | "buyer"
}) {
  const setFilter = useUrlFilter()

  const filters: { value: "all" | "admin" | "seller" | "buyer"; label: string }[] = [
    { value: "all", label: "All" },
    { value: "admin", label: "Admins" },
    { value: "seller", label: "Sellers" },
    { value: "buyer", label: "Buyers" },
  ]

  const columns: DataTableColumn<UserRow>[] = [
    {
      key: "user",
      header: "User",
      primaryOnMobile: true,
      render: (u) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink-900">{u.name}</p>
          <p className="mt-0.5 truncate text-xs text-ink-500">{u.email}</p>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (u) => (
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
            ROLE_BADGE_STYLES[u.roleLabel],
          )}
        >
          {u.roleLabel}
        </span>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      hideOnMobile: true,
      render: (u) => <span className="text-xs text-ink-600">{u.phone ?? "—"}</span>,
    },
    {
      key: "verified",
      header: "Verified",
      hideOnMobile: true,
      render: (u) =>
        u.isVerified ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
            <BadgeCheck className="h-3 w-3" />
            Yes
          </span>
        ) : (
          <span className="text-xs text-ink-500">—</span>
        ),
    },
    {
      key: "joined",
      header: "Joined",
      hideOnMobile: true,
      render: (u) => (
        <span className="text-xs text-ink-500">
          {u.createdAt ? formatDate(u.createdAt) : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (u) => (
        <Link href={ROUTES.ADMIN_USER_DETAIL(u.id)}>
          <Button size="sm" variant="outline" className="rounded-full">
            View
          </Button>
        </Link>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter("role", f.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
              role === f.value
                ? "border-brand-700 bg-brand-700 text-white"
                : "border-border/70 bg-white text-ink-700 hover:bg-brand-50",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      <DataTable
        columns={columns}
        data={users}
        rowKey={(u) => u.id}
        emptyMessage="No users match this filter."
      />
    </div>
  )
}

const PROJECT_STATUS_STYLES: Record<
  ProjectStatus,
  { label: string; classes: string }
> = {
  ongoing: { label: "Ongoing", classes: "border-blue-200 bg-blue-50 text-blue-700" },
  upcoming: { label: "Upcoming", classes: "border-amber-200 bg-amber-50 text-amber-700" },
  completed: { label: "Completed", classes: "border-emerald-200 bg-emerald-50 text-emerald-700" },
}

const PROJECT_STATUS_FILTERS: { value: ProjectStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "ongoing", label: "Ongoing" },
  { value: "upcoming", label: "Upcoming" },
  { value: "completed", label: "Completed" },
]

export function AdminProjectsTable({
  projects,
  status = "all",
}: {
  projects: Project[]
  status?: ProjectStatus | "all"
}) {
  const { data: session } = useSession()
  const token = session?.accessToken
  const setFilter = useUrlFilter()
  const [rows, setRows] = useState<Project[]>(projects)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)

  function applyUpdate(updated: Project) {
    setRows((current) => current.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)))
  }

  function reportError(err: unknown, fallback: string) {
    setError(
      err instanceof ApiError ? err.message : err instanceof Error ? err.message : fallback,
    )
  }

  async function runAction(id: string, action: () => Promise<Project>, fallback: string) {
    setBusyId(id)
    setError(null)
    try {
      applyUpdate(await action())
    } catch (err) {
      reportError(err, fallback)
    } finally {
      setBusyId(null)
    }
  }

  function markComplete(p: Project) {
    return runAction(
      p.id,
      () => projectsService.setStatus(p.id, "completed", token),
      "Could not mark this apartment complete.",
    )
  }

  function toggleFeature(p: Project) {
    return runAction(
      p.id,
      () => projectsService.setFeatured(p.id, !p.isFeatured, token),
      "Could not update featured flag.",
    )
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const target = deleteTarget
    setBusyId(target.id)
    setError(null)
    try {
      await projectsService.remove(target.id, token)
      setRows((current) => current.filter((p) => p.id !== target.id))
      setDeleteTarget(null)
    } catch (err) {
      reportError(err, "Could not delete this apartment.")
    } finally {
      setBusyId(null)
    }
  }

  const columns: DataTableColumn<Project>[] = [
    {
      key: "project",
      header: "Apartment",
      primaryOnMobile: true,
      className: "w-[24rem] max-w-[24rem]",
      render: (p) => (
        <div className="min-w-0 max-w-[18rem]">
          <Link
            href={ROUTES.PROJECT_DETAIL(p.slug)}
            className="block truncate font-semibold text-ink-900 hover:text-brand-700"
          >
            {p.name}
          </Link>
          <p className="mt-0.5 max-w-[18rem] truncate break-all text-xs text-ink-500" title={p.location}>
            {p.location}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (p) => {
        const style = PROJECT_STATUS_STYLES[p.status] ?? PROJECT_STATUS_STYLES.ongoing
        return (
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
              style.classes,
            )}
          >
            {style.label}
          </span>
        )
      },
    },
    {
      key: "units",
      header: "Units",
      hideOnMobile: true,
      render: (p) => (
        <span className="text-xs text-ink-700">
          {p.availableUnits != null && p.totalUnits != null
            ? `${p.availableUnits} / ${p.totalUnits} avail.`
            : p.totalUnits != null
              ? `${p.totalUnits} total`
              : "—"}
        </span>
      ),
    },
    {
      key: "handover",
      header: "Handover",
      hideOnMobile: true,
      render: (p) => (
        <span className="text-xs text-ink-500">
          {p.handoverDate ? formatDate(p.handoverDate) : "—"}
        </span>
      ),
    },
    {
      key: "featured",
      header: "Featured",
      hideOnMobile: true,
      render: (p) =>
        p.isFeatured ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-gold-300 bg-gold-50 px-2 py-0.5 text-xs font-medium text-gold-700">
            <BadgeCheck className="h-3 w-3" />
            Yes
          </span>
        ) : (
          <span className="text-xs text-ink-400">—</span>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (p) => {
        const busy = busyId === p.id
        const isFeatured = Boolean(p.isFeatured)
        const isCompleted = p.status === "completed"
        return (
          <div className="flex items-center justify-end gap-1">
            <Link href={ROUTES.PROJECT_DETAIL(p.slug)} title="View apartment">
              <Button size="icon" variant="outline" className="size-8 rounded-full" aria-label="View apartment">
                <Eye className="size-3.5" />
              </Button>
            </Link>

            <Link href={ROUTES.ADMIN_PROJECT_EDIT(p.id)} title="Edit apartment">
              <Button size="icon" variant="outline" className="size-8 rounded-full" aria-label="Edit apartment">
                <Pencil className="size-3.5" />
              </Button>
            </Link>

            {!isCompleted ? (
              <Button
                size="icon"
                variant="outline"
                disabled={busy}
                onClick={() => markComplete(p)}
                title="Mark complete"
                aria-label="Mark apartment complete"
                className="size-8 rounded-full border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              >
                {busy ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
              </Button>
            ) : null}

            <Button
              size="icon"
              variant="outline"
              disabled={busy}
              onClick={() => toggleFeature(p)}
              title={isFeatured ? "Unfeature" : "Feature"}
              aria-label={isFeatured ? "Unfeature apartment" : "Feature apartment"}
              className={cn(
                "size-8 rounded-full",
                isFeatured
                  ? "border-gold-300 bg-gold-50 text-gold-700"
                  : "border-border/70 text-ink-600 hover:bg-gold-50",
              )}
            >
              {busy ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Star className={cn("size-3.5", isFeatured && "fill-gold-400")} />
              )}
            </Button>

            <Button
              size="icon"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setDeleteTarget(p)
                setError(null)
              }}
              title="Delete"
              aria-label="Delete apartment"
              className="size-8 rounded-full border-red-200 text-red-600 hover:bg-red-50"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {PROJECT_STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter("status", f.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
              status === f.value
                ? "border-brand-700 bg-brand-700 text-white"
                : "border-border/70 bg-white text-ink-700 hover:bg-brand-50",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <DataTable
        columns={columns}
        data={rows}
        rowKey={(p) => p.id}
        emptyMessage="No apartments match this filter."
      />

      {/* Delete confirmation dialog */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && busyId === null) setDeleteTarget(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete apartment</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `"${deleteTarget.name}" and its uploaded media will be permanently removed. This cannot be undone.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busyId !== null}
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={busyId !== null}
              onClick={confirmDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {busyId !== null ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Deleting
                </>
              ) : (
                <>
                  <Trash2 className="size-4" /> Delete apartment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── AdminInquiriesTable ───────────────────────────────────────────────────────

const INQUIRY_STATUS_FILTERS: { value: InquiryStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "read", label: "Read" },
  { value: "replied", label: "Replied" },
  { value: "closed", label: "Closed" },
]

const INQUIRY_TYPE_FILTERS: { value: InquiryType | "all"; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "property", label: "Property" },
  { value: "project", label: "Apartment" },
  { value: "general", label: "General" },
  { value: "report", label: "Report" },
  { value: "supplier", label: "Supplier" },
  { value: "investor", label: "Investor" },
]

export function AdminInquiriesTable({
  inquiries,
  // Base path is passed as a serializable string (not a route function) so this
  // client component can be rendered from server pages — functions can't cross
  // the RSC boundary. Detail URL is `${basePath}/${id}`.
  basePath = ROUTES.ADMIN_INQUIRIES,
  // When set, the table is locked to one type (e.g. the Supplier/Investor request
  // pages) — the type filter chips are hidden and only that type is shown.
  lockedType,
  status = "all",
  type = "all",
}: {
  inquiries: Inquiry[]
  basePath?: string
  lockedType?: InquiryType
  status?: InquiryStatus | "all"
  type?: InquiryType | "all"
}) {
  const setFilter = useUrlFilter()

  const columns: DataTableColumn<Inquiry>[] = [
    {
      key: "contact",
      header: "From",
      primaryOnMobile: true,
      render: (i) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink-900">{i.name}</p>
          <p className="mt-0.5 truncate text-xs text-ink-500">{i.email}</p>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      hideOnMobile: true,
      render: (i) => {
        const isPartner = i.type === "supplier" || i.type === "investor"
        return (
          <span
            className={cn(
              "inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
              isPartner ? "bg-gold-100 text-gold-800" : "bg-ink-100 text-ink-600",
            )}
          >
            {i.type}
          </span>
        )
      },
    },
    {
      key: "related",
      header: "Related to",
      hideOnMobile: true,
      render: (i) => (
        <span className="truncate text-xs text-ink-700">
          {i.type === "supplier"
            ? "Supplier application"
            : i.type === "investor"
              ? "Investor application"
              : (i.propertyTitle ?? i.projectName ?? "General")}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (i) => <InquiryStatusBadge status={i.status} />,
    },
    {
      key: "date",
      header: "Date",
      hideOnMobile: true,
      render: (i) => (
        <span className="text-xs text-ink-500">{formatDate(i.createdAt)}</span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (i) => (
        <Link href={`${basePath}/${i.id}`}>
          <Button size="sm" variant="outline" className="rounded-full">
            <Eye className="size-3.5" />
            View
          </Button>
        </Link>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {INQUIRY_STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter("status", f.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
              status === f.value
                ? "border-brand-700 bg-brand-700 text-white"
                : "border-border/70 bg-white text-ink-700 hover:bg-brand-50",
            )}
          >
            {f.label}
          </button>
        ))}
        {!lockedType && <span className="mx-2 text-border/60">|</span>}
        {!lockedType &&
          INQUIRY_TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter("type", f.value)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                type === f.value
                  ? "border-ink-700 bg-ink-700 text-white"
                  : "border-border/70 bg-white text-ink-700 hover:bg-ink-50",
              )}
            >
              {f.label}
            </button>
          ))}
      </div>
      <DataTable
        columns={columns}
        data={inquiries}
        rowKey={(i) => i.id}
        emptyMessage="No inquiries match this filter."
      />
    </div>
  )
}

// ─── AdminBookingsTable ────────────────────────────────────────────────────────

const BOOKING_STATUS_FILTERS: { value: BookingStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "completed", label: "Completed" },
]

export function AdminBookingsTable({
  bookings,
  status = "all",
}: {
  bookings: Booking[]
  status?: BookingStatus | "all"
}) {
  const setFilter = useUrlFilter()

  const columns: DataTableColumn<Booking>[] = [
    {
      key: "contact",
      header: "Client",
      primaryOnMobile: true,
      render: (b) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink-900">{b.name}</p>
          <p className="mt-0.5 truncate text-xs text-ink-500">{b.email}</p>
        </div>
      ),
    },
    {
      key: "type",
      header: "Consultation",
      hideOnMobile: true,
      render: (b) => (
        <span className="text-xs font-medium capitalize text-ink-600">
          {b.consultationType.replace(/-/g, " ")}
        </span>
      ),
    },
    {
      key: "related",
      header: "Related to",
      hideOnMobile: true,
      render: (b) => (
        <span className="truncate text-xs text-ink-700">
          {b.projectName ?? b.propertyTitle ?? "—"}
        </span>
      ),
    },
    {
      key: "datetime",
      header: "Appointment",
      render: (b) => (
        <div>
          <p className="text-xs font-medium text-ink-800">{formatDate(b.preferredDate)}</p>
          <p className="text-xs text-ink-500">{b.preferredTime}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (b) => <BookingStatusBadge status={b.status} />,
    },
    {
      key: "submitted",
      header: "Submitted",
      hideOnMobile: true,
      render: (b) => (
        <span className="text-xs text-ink-500">{formatDate(b.createdAt)}</span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (b) => (
        <Link href={ROUTES.ADMIN_BOOKING_DETAIL(b.id)}>
          <Button size="sm" variant="outline" className="rounded-full">
            View
          </Button>
        </Link>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {BOOKING_STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter("status", f.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
              status === f.value
                ? "border-brand-700 bg-brand-700 text-white"
                : "border-border/70 bg-white text-ink-700 hover:bg-brand-50",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      <DataTable
        columns={columns}
        data={bookings}
        rowKey={(b) => b.id}
        emptyMessage="No bookings match this filter."
      />
    </div>
  )
}

// ─── AdminBlogTable ────────────────────────────────────────────────────────────

export function AdminBlogTable({
  posts,
  token,
  status = "all",
}: {
  posts: BlogPost[]
  token?: string
  status?: "all" | "published" | "draft"
}) {
  const router = useRouter()
  const setFilter = useUrlFilter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const columns: DataTableColumn<BlogPost>[] = [
    {
      key: "title",
      header: "Post",
      primaryOnMobile: true,
      render: (p) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink-900">{p.title}</p>
          <p className="mt-0.5 truncate text-xs text-ink-500">{p.category}</p>
        </div>
      ),
    },
    {
      key: "author",
      header: "Author",
      hideOnMobile: true,
      render: (p) => (
        <span className="text-xs text-ink-700">
          {typeof p.author === "string" ? p.author : p.author.name}
        </span>
      ),
    },
    {
      key: "readMinutes",
      header: "Read",
      hideOnMobile: true,
      render: (p) => (
        <span className="text-xs text-ink-500">{p.readMinutes} min</span>
      ),
    },
    {
      key: "views",
      header: "Views",
      hideOnMobile: true,
      render: (p) => (
        <span className="text-xs text-ink-500">{(p.viewCount ?? 0).toLocaleString()}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (p) =>
        p.isPublished ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
            <Eye className="h-3 w-3" />
            Published
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-ink-50 px-2 py-0.5 text-xs font-medium text-ink-600">
            <EyeOff className="h-3 w-3" />
            Draft
          </span>
        ),
    },
    {
      key: "publishedAt",
      header: "Date",
      hideOnMobile: true,
      render: (p) => (
        <span className="text-xs text-ink-500">{formatDate(p.publishedAt)}</span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (p) => (
        <div className="flex flex-wrap items-center gap-2">
          <Link href={ROUTES.ADMIN_BLOG_EDIT(p.id)}>
            <Button size="sm" variant="outline" className="rounded-full">
              Edit
            </Button>
          </Link>
          <Button
            size="sm"
            variant="outline"
            className="rounded-full"
            disabled={busyId === p.id}
            onClick={() => togglePublished(p)}
          >
            {busyId === p.id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : p.isPublished ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
            {p.isPublished ? "Draft" : "Publish"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-full border-red-200 text-red-700 hover:bg-red-50"
            disabled={busyId === p.id}
            onClick={() => removePost(p)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  async function togglePublished(post: BlogPost) {
    setBusyId(post.id)
    setError(null)

    try {
      await blogService.update(
        post.id,
        { isPublished: !post.isPublished },
        token,
      )
      router.refresh()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update article status.")
    } finally {
      setBusyId(null)
    }
  }

  async function removePost(post: BlogPost) {
    if (!window.confirm(`Delete "${post.title}"? This cannot be undone.`)) return

    setBusyId(post.id)
    setError(null)

    try {
      await blogService.remove(post.id, token)
      router.refresh()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete article.")
    } finally {
      setBusyId(null)
    }
  }

  const filters: { value: "all" | "published" | "draft"; label: string }[] = [
    { value: "all", label: "All" },
    { value: "published", label: "Published" },
    { value: "draft", label: "Draft" },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter("status", f.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
              status === f.value
                ? "border-brand-700 bg-brand-700 text-white"
                : "border-border/70 bg-white text-ink-700 hover:bg-brand-50",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}
      <DataTable
        columns={columns}
        data={posts}
        rowKey={(p) => p.id}
        emptyMessage="No blog posts found."
      />
    </div>
  )
}

// ─── AdminReportsTable ─────────────────────────────────────────────────────────

const REPORT_STATUS_FILTERS: { value: ReportStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "reviewed", label: "Reviewed" },
  { value: "resolved", label: "Resolved" },
]

const REPORT_STATUS_STYLES: Record<ReportStatus, string> = {
  open: "border-red-200 bg-red-50 text-red-700",
  reviewed: "border-amber-200 bg-amber-50 text-amber-700",
  resolved: "border-emerald-200 bg-emerald-50 text-emerald-700",
}

export function AdminReportsTable({
  reports,
  status = "all",
}: {
  reports: Report[]
  status?: ReportStatus | "all"
}) {
  const setFilter = useUrlFilter()

  const columns: DataTableColumn<Report>[] = [
    {
      key: "property",
      header: "Listing",
      primaryOnMobile: true,
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink-900">
            {r.propertyTitle ?? r.propertyId}
          </p>
          <p className="mt-0.5 truncate text-xs text-ink-500">{r.reason}</p>
        </div>
      ),
    },
    {
      key: "reporter",
      header: "Reported by",
      hideOnMobile: true,
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-ink-800">{r.name}</p>
          <p className="truncate text-xs text-ink-500">{r.email}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
            REPORT_STATUS_STYLES[r.status],
          )}
        >
          {r.status}
        </span>
      ),
    },
    {
      key: "date",
      header: "Reported",
      hideOnMobile: true,
      render: (r) => (
        <span className="text-xs text-ink-500">{formatDate(r.createdAt)}</span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (r) => (
        <Link href={`${ROUTES.ADMIN_INQUIRIES}/${r.id}`}>
          <Button size="sm" variant="outline" className="rounded-full">
            <Eye className="size-3.5" />
            Review
          </Button>
        </Link>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {REPORT_STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter("status", f.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
              status === f.value
                ? "border-brand-700 bg-brand-700 text-white"
                : "border-border/70 bg-white text-ink-700 hover:bg-brand-50",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      <DataTable
        columns={columns}
        data={reports}
        rowKey={(r) => r.id}
        emptyMessage="No reports match this filter."
      />
    </div>
  )
}

// ─── AdminSettingsForm ─────────────────────────────────────────────────────────

export function AdminSettingsForm({
  initialValues,
}: {
  initialValues: { siteName: string; contactEmail: string; phone: string }
}) {
  const { data: session } = useSession()
  const token = session?.accessToken

  const [values, setValues] = useState(initialValues)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSaved(false)
    setError(null)
    setValues((v) => ({ ...v, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const updated = await updateSettings(
        {
          siteName: values.siteName.trim(),
          contactEmail: values.contactEmail.trim(),
          phone: values.phone.trim(),
        },
        token,
      )
      setValues({
        siteName: updated.siteName,
        contactEmail: updated.contactEmail,
        phone: updated.phone,
      })
      setSaved(true)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not save settings.",
      )
    } finally {
      setSaving(false)
    }
  }

  const fields: { name: keyof typeof values; label: string; type?: string }[] = [
    { name: "siteName", label: "Site Name" },
    { name: "contactEmail", label: "Contact Email", type: "email" },
    { name: "phone", label: "Phone Number", type: "tel" },
  ]

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
      {fields.map((f) => (
        <div key={f.name} className="space-y-1.5">
          <label htmlFor={f.name} className="text-sm font-medium text-ink-800">
            {f.label}
          </label>
          <input
            id={f.name}
            name={f.name}
            type={f.type ?? "text"}
            value={values[f.name]}
            onChange={handleChange}
            disabled={saving}
            className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600 disabled:opacity-60"
          />
        </div>
      ))}

      {error ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" className="rounded-full" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Saving
            </>
          ) : (
            "Save changes"
          )}
        </Button>
        {saved && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
            <CheckCircle2 className="size-3.5" />
            Settings saved
          </span>
        )}
      </div>
    </form>
  )
}

// ─── BuyerProfileForm ──────────────────────────────────────────────────────────

export function BuyerProfileForm({ buyer }: { buyer: Buyer | null }) {
  const [values, setValues] = useState({
    name: buyer?.name ?? "",
    email: buyer?.email ?? "",
    phone: buyer?.phone ?? "",
  })
  const [saved, setSaved] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSaved(false)
    setValues((v) => ({ ...v, [e.target.name]: e.target.value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaved(true)
  }

  const fields: { name: keyof typeof values; label: string; type?: string }[] = [
    { name: "name", label: "Full Name" },
    { name: "email", label: "Email Address", type: "email" },
    { name: "phone", label: "Phone Number", type: "tel" },
  ]

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-5 pt-2">
      {fields.map((f) => (
        <div key={f.name} className="space-y-1.5">
          <label htmlFor={`buyer-${f.name}`} className="text-sm font-medium text-ink-800">
            {f.label}
          </label>
          <input
            id={`buyer-${f.name}`}
            name={f.name}
            type={f.type ?? "text"}
            value={values[f.name]}
            onChange={handleChange}
            className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
          />
        </div>
      ))}
      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" className="rounded-full">Save changes</Button>
        {saved && <span className="text-xs font-medium text-emerald-600">Profile saved</span>}
      </div>
    </form>
  )
}

// ─── SellerPropertiesTable ─────────────────────────────────────────────────────

export function SellerPropertiesTable({
  properties,
  status = "all",
}: {
  properties: Property[]
  status?: PropertyStatus | "all"
}) {
  const setFilter = useUrlFilter()

  const columns: DataTableColumn<Property>[] = [
    {
      key: "title",
      header: "Listing",
      primaryOnMobile: true,
      render: (p) => (
        <div className="min-w-0">
          <Link
            href={ROUTES.PROPERTY_DETAIL(p.slug)}
            className="block truncate font-semibold text-ink-900 hover:text-brand-700"
          >
            {p.title}
          </Link>
          <p className="mt-0.5 truncate text-xs text-ink-500">
            {p.area}, {p.district}
          </p>
        </div>
      ),
    },
    {
      key: "price",
      header: "Price",
      render: (p) => (
        <span className="text-sm font-semibold text-brand-700">
          {p.purpose === "rent" ? formatRent(p.price) : formatPrice(p.price, true)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (p) => <ListingStatusBadge status={p.status} />,
    },
    {
      key: "date",
      header: "Added",
      hideOnMobile: true,
      render: (p) => (
        <span className="text-xs text-ink-500">
          {p.createdAt ? formatDate(p.createdAt) : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (p) => (
        <Link href={ROUTES.SELLER_PROPERTY_EDIT(p.id)}>
          <Button size="sm" variant="outline" className="rounded-full">
            Edit
          </Button>
        </Link>
      ),
    },
  ]

  const statusFilters: { value: PropertyStatus | "all"; label: string }[] = [
    { value: "all", label: "All" },
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "verified", label: "Verified" },
    { value: "rejected", label: "Rejected" },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {statusFilters.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter("status", f.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
              status === f.value
                ? "border-brand-700 bg-brand-700 text-white"
                : "border-border/70 bg-white text-ink-700 hover:bg-brand-50",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      <DataTable
        columns={columns}
        data={properties}
        rowKey={(p) => p.id}
        emptyMessage="No listings yet."
      />
    </div>
  )
}

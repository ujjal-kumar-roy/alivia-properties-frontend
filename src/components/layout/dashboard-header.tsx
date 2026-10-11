"use client"

import { useRouter } from "next/navigation"
import {
  ChevronRight,
  Home,
  LogOut,
  Menu,
  Search,
  Settings,
  User,
} from "lucide-react"
import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AutoHideHeader } from "@/components/layout/auto-hide-header"
import { NotificationsBell } from "@/components/layout/notifications-bell"
import { ROUTES } from "@/config/routes.config"
import { cn } from "@/lib/utils"

interface BreadcrumbItem {
  label: string
  href?: string
}

interface DashboardHeaderProps {
  title: string
  breadcrumbs?: BreadcrumbItem[]
  onOpenNav?: () => void
  /** Pending items to flag on the menu button while the sidebar is tucked away. */
  pendingCount?: number
}

/** Where each role edits their own account. Admins keep it under Settings. */
const PROFILE_ROUTE = {
  admin: ROUTES.ADMIN_SETTINGS,
  seller: ROUTES.SELLER_PROFILE,
  buyer: ROUTES.BUYER_PROFILE,
} as const

/** A 44px round control that sits inside the capsule without adding another glass layer. */
const CAPSULE_BUTTON =
  "flex size-11 shrink-0 items-center justify-center rounded-full border border-border/70 bg-white text-ink-700 outline-none transition-[background-color,scale] hover:bg-brand-50 focus-visible:ring-2 focus-visible:ring-brand-400 active:scale-95 sm:size-10 lg:rounded-2xl"

export function DashboardHeader({
  title,
  breadcrumbs,
  onOpenNav,
  pendingCount = 0,
}: DashboardHeaderProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const user = session?.user
  const role = user?.role
  const profileHref = role ? PROFILE_ROUTE[role] : ROUTES.HOME

  async function handleLogout() {
    await signOut({ redirect: false })
    router.push(ROUTES.LOGIN)
  }

  const initials =
    user?.name
      ?.split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "U"

  return (
    // Below lg the capsule leaves on scroll-down and returns on scroll-up (the phone keeps the
    // whole viewport for data); from lg it stays put next to the persistent sidebar.
    <AutoHideHeader
      threshold={64}
      className="sticky top-2 z-30 lg:top-3 lg:data-[hidden=true]:transform-none"
    >
      <div className="liquid-glass-nav flex h-13 items-center gap-1.5 rounded-full border p-1 sm:h-15 sm:gap-2 sm:px-2 lg:min-h-17 lg:gap-4 lg:rounded-[1.75rem] lg:px-4 lg:py-2.5">
        {onOpenNav && (
          <button
            type="button"
            onClick={onOpenNav}
            className={cn(CAPSULE_BUTTON, "relative lg:hidden")}
            aria-label={
              pendingCount > 0
                ? `Open dashboard navigation, ${pendingCount} pending`
                : "Open dashboard navigation"
            }
          >
            <Menu className="size-5" />
            {pendingCount > 0 && (
              <span
                aria-hidden
                className="absolute right-0.5 top-0.5 size-2.5 rounded-full border-2 border-white bg-gold-400"
              />
            )}
          </button>
        )}

        <div className="min-w-0 flex-1 pl-0.5 sm:pl-1 lg:pl-0">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav
              aria-label="Breadcrumb"
              className="mb-0.5 hidden items-center gap-1 text-[0.6875rem] uppercase tracking-[0.18em] text-ink-500 sm:flex"
            >
              {breadcrumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="h-3 w-3" />}
                  <span
                    className={
                      i === breadcrumbs.length - 1
                        ? "text-brand-700"
                        : "text-ink-500"
                    }
                  >
                    {crumb.label}
                  </span>
                </span>
              ))}
            </nav>
          )}
          {/* A paragraph, not a heading: every page carries its own h1. */}
          <p className="truncate font-heading text-[0.9375rem] font-semibold leading-tight text-foreground sm:text-lg">
            {title}
          </p>
        </div>

        {/* Search (desktop) */}
        <label className="hidden h-10 w-44 shrink items-center gap-2 rounded-full border border-border/70 bg-white px-3 text-sm text-ink-500 transition-colors focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-200 lg:flex xl:w-64 2xl:w-72">
          <Search className="h-4 w-4 shrink-0 text-ink-400" />
          <input
            type="search"
            placeholder="Search listings, users, inquiries…"
            aria-label="Search"
            className="h-full w-full bg-transparent text-sm text-ink-800 placeholder:text-ink-500 focus:outline-none"
          />
          <kbd className="hidden rounded-md border border-border bg-ink-50 px-1.5 py-0.5 text-[0.6875rem] font-medium text-ink-500 lg:inline-block">
            ⌘K
          </kbd>
        </label>

        {/* Back to home */}
        <Link
          href={ROUTES.HOME}
          className="hidden lg:flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border/80 bg-white text-ink-700 transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          title="Back to home"
          aria-label="Back to home"
        >
          <Home className="h-4 w-4" />
        </Link>

        {/* Notifications */}
        <NotificationsBell />

        {/* Avatar dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Account menu"
            className="shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
          >
            <div className="flex size-11 items-center justify-center rounded-full border border-border/70 bg-white transition-colors hover:bg-brand-50 sm:h-10 sm:w-auto sm:gap-3 sm:pl-1.5 sm:pr-3">
              <Avatar className="size-8 sm:size-7">
                <AvatarImage src={user?.image ?? undefined} alt={user?.name ?? ""} />
                <AvatarFallback className="bg-linear-to-br from-brand-600 to-brand-800 text-[0.6875rem] font-semibold text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden min-w-0 max-w-32 flex-col items-start text-left sm:flex">
                <span className="truncate text-xs font-semibold text-ink-900">
                  {user?.name ?? "Guest"}
                </span>
                <span className="truncate text-[0.6875rem] uppercase tracking-[0.16em] text-ink-500">
                  {user?.role ?? "user"}
                </span>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="w-56 min-w-56 rounded-2xl p-1.5">
            <div className="px-2.5 py-2">
              <p className="truncate text-sm font-semibold text-ink-900">
                {user?.name ?? "Guest"}
              </p>
              <p className="truncate text-xs text-ink-500">{user?.email ?? ""}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="min-h-11 gap-2.5 rounded-xl px-3 text-sm"
              onClick={() => router.push(profileHref)}
            >
              {role === "admin" ? <Settings className="h-4 w-4" /> : <User className="h-4 w-4" />}
              {role === "admin" ? "Settings" : "Profile"}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="min-h-11 gap-2.5 rounded-xl px-3 text-sm lg:hidden"
              onClick={() => router.push(ROUTES.HOME)}
            >
              <Home className="h-4 w-4" />
              Back to site
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              className="min-h-11 gap-2.5 rounded-xl px-3 text-sm"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </AutoHideHeader>
  )
}

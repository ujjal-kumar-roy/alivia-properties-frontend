"use client"

import { useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar"
import { DashboardHeader } from "@/components/layout/dashboard-header"
import { DashboardDrawer } from "@/components/dashboard/dashboard-drawer"
import { ROUTES } from "@/config/routes.config"
import type { DashboardNavItem } from "@/config/dashboard-nav.config"

/** Routes that live under a nav entry without sharing its URL prefix (so the header can still name them). */
const NAV_ALIASES: Record<string, string> = {
  "/admin/marketplace/products": ROUTES.ADMIN_MARKETPLACE_SUPPLIERS,
}

interface DashboardShellProps {
  nav: DashboardNavItem[]
  children: React.ReactNode
  pendingCount?: number
  roleLabel: string
}

/**
 * The frame every dashboard lives in.
 *
 * The WINDOW scrolls (not an inner pane): the phone's browser bar can collapse, pull-to-refresh
 * and tap-status-bar-to-top keep working, the glass header can hide on scroll, and a
 * `MobileActionBar` pads the page the same way it does on the public site.
 * lg and up: a sticky glass sidebar next to the content. Below lg: that sidebar becomes an
 * off-canvas drawer opened from the header's menu button.
 */
export function DashboardShell({
  nav,
  children,
  pendingCount = 0,
  roleLabel,
}: DashboardShellProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const currentItem = useMemo(() => {
    const alias = Object.keys(NAV_ALIASES).find(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
    const path = alias ? NAV_ALIASES[alias] : pathname
    return nav
      .filter((item) => path === item.href || path.startsWith(`${item.href}/`))
      .sort((a, b) => b.href.length - a.href.length)[0]
  }, [nav, pathname])

  // A route with no nav entry is named after the workspace, never a wrong section.
  const title = currentItem?.label ?? roleLabel
  const breadcrumbs = [
    { label: roleLabel },
    ...(currentItem ? [{ label: currentItem.label }] : []),
  ]

  return (
    <div className="flex min-h-dvh">
      {/* Persistent sidebar (lg and up) */}
      <DashboardSidebar nav={nav} pendingCount={pendingCount} roleLabel={roleLabel} />

      {/* Off-canvas drawer (below lg) */}
      <DashboardDrawer
        open={mobileOpen}
        onOpenChange={setMobileOpen}
        nav={nav}
        pendingCount={pendingCount}
        roleLabel={roleLabel}
      />

      {/* Content column. overflow-x-clip is a safety net that, unlike hidden, keeps sticky children working. */}
      <div className="flex min-w-0 flex-1 flex-col overflow-x-clip px-3 pt-2 sm:px-4 sm:pt-3 md:px-6 lg:pt-6">
        <DashboardHeader
          title={title}
          breadcrumbs={breadcrumbs}
          onOpenNav={() => setMobileOpen(true)}
          pendingCount={pendingCount}
        />
        <main
          id="main-content"
          tabIndex={-1}
          className="mt-3 min-w-0 max-w-full flex-1 pb-8 outline-none sm:mt-6 lg:mt-3"
        >
          {children}
        </main>
      </div>
    </div>
  )
}

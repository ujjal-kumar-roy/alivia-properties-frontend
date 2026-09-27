export const dynamic = "force-dynamic"

import { Settings } from "lucide-react"
import { auth } from "@/auth"
import { siteConfig } from "@/config/site.config"
import { getSettings } from "@/services/settings.service"
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header"
import { AdminSettingsForm } from "@/pages-sections/admin/admin-views"

export default async function AdminSettingsPage() {
  const session = await auth()
  // Backend unreachable or unauthorized — fall back to static site config so
  // the page still renders with sane defaults (matches the hero/blog pages).
  const settings = await getSettings(session?.accessToken).catch(() => null)

  return (
    <div>
      <DashboardPageHeader
        icon={Settings}
        eyebrow="Content"
        title="Settings"
        description="Manage platform-wide site settings."
      />
      <AdminSettingsForm
        initialValues={{
          siteName: settings?.siteName ?? siteConfig.name,
          contactEmail: settings?.contactEmail ?? siteConfig.contact.email,
          phone: settings?.phone ?? siteConfig.contact.phone,
        }}
      />
    </div>
  )
}

export const dynamic = "force-dynamic"

import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { ProjectForm } from "@/components/forms/project-form"
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header"
import { Button } from "@/components/ui/button"
import { ROUTES } from "@/config/routes.config"

export default function AdminCreateProjectPage() {
  return (
    <div className="space-y-3 sm:space-y-6">
      <DashboardPageHeader
        eyebrow="Inventory"
        title="Add Apartment"
        description="Create a new Alivia development apartment for the showcase."
        actions={(
          <Button variant="outline" className="rounded-full" render={<Link href={ROUTES.ADMIN_PROJECTS} />}>
            <ChevronLeft className="h-4 w-4" />
            Back to Apartments
          </Button>
        )}
      />
      <ProjectForm mode="create" />
    </div>
  )
}

export const dynamic = "force-dynamic"

import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { auth } from "@/auth"
import { getProjectById } from "@/services/projects.service"
import { ProjectForm } from "@/components/forms/project-form"
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header"
import { Button } from "@/components/ui/button"
import { ROUTES } from "@/config/routes.config"

interface AdminEditProjectPageProps {
  params: Promise<{ id: string }>
}

export default async function AdminEditProjectPage({ params }: AdminEditProjectPageProps) {
  const { id } = await params
  const session = await auth()
  const project = await getProjectById(id, session?.accessToken).catch(() => null)

  if (!project) notFound()

  return (
    <div className="space-y-3 sm:space-y-6">
      <DashboardPageHeader
        eyebrow="Inventory"
        title="Edit Apartment"
        description={`Update details for ${project.name}.`}
        actions={(
          <Button variant="outline" className="rounded-full" render={<Link href={ROUTES.ADMIN_PROJECTS} />}>
            <ChevronLeft className="h-4 w-4" />
            Back to Apartments
          </Button>
        )}
      />
      <ProjectForm mode="edit" initialProject={project} />
    </div>
  )
}

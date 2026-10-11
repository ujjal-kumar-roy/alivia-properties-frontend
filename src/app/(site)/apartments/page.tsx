export const dynamic = "force-dynamic"

import { Suspense } from "react"
import Link from "next/link"
import { getProjects } from "@/services/projects.service"
import { ProjectsInfiniteList } from "@/components/projects/projects-infinite-list"
import { ProjectFilterSidebar } from "@/components/projects/project-filter-sidebar"
import { SectionHeader } from "@/components/common/section-header"
import { EmptyState } from "@/components/common/empty-state"
import { Building2 } from "lucide-react"
import type { ProjectStatus } from "@/types/project.types"

const STATUS_TABS: { label: string; value: string }[] = [
  { label: "All",       value: "" },
  { label: "Ongoing",   value: "ongoing" },
  { label: "Upcoming",  value: "upcoming" },
  { label: "Completed", value: "completed" },
]

interface ProjectsPageProps {
  searchParams: Promise<{
    status?: string
    page?: string
    search?: string
    minPrice?: string
    maxPrice?: string
    featured?: string
    sort?: string
    view?: string
  }>
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const { status, page: rawPage, search, minPrice, maxPrice, featured, sort, view } = await searchParams
  const page = Math.max(1, Number(rawPage) || 1)

  const filters = {
    status: status as ProjectStatus | undefined,
    search: search || undefined,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    featured: featured === "true" || undefined,
    sort: sort || undefined,
    view: view || undefined,
  }

  const res = await getProjects({ ...filters, page, limit: 12 })

  const activeTags = [
    search && `Search: ${search}`,
    view && `View: ${view}`,
    minPrice && `Min: ৳${(Number(minPrice) / 100000).toFixed(0)}L`,
    maxPrice && `Max: ৳${(Number(maxPrice) / 100000).toFixed(0)}L`,
    featured === "true" && "Flagship only",
  ].filter(Boolean) as string[]

  const listKey = JSON.stringify(filters)

  return (
    <div className="py-3 md:py-12">
      <div className="container-page">
        <SectionHeader
          as="h1"
          eyebrow="Our Portfolio"
          title="Alivia Apartments"
          subtitle="Explore our premium residential and commercial developments across Bangladesh."
          align="left"
        />

        {/* Status chips: one scrollable row on phones, wrapping row from sm */}
        <div className="mb-3 mt-3 flex items-center justify-between gap-3 sm:mb-6 sm:mt-8">
          <nav
            aria-label="Filter apartments by status"
            className="-mx-4 flex flex-1 gap-1.5 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:flex-none sm:flex-wrap sm:gap-2 sm:overflow-visible sm:px-0"
          >
            {STATUS_TABS.map((tab) => {
              const isActive = (status ?? "") === tab.value
              const href = new URLSearchParams()
              if (tab.value) href.set("status", tab.value)
              return (
                <Link
                  key={tab.value}
                  href={tab.value ? `/apartments?${href.toString()}` : "/apartments"}
                  aria-current={isActive ? "page" : undefined}
                  className="glass-chip sm:min-h-11 sm:px-5 sm:text-sm"
                >
                  {tab.label}
                </Link>
              )
            })}
          </nav>

          <p className="hidden text-sm text-muted-foreground sm:block">
            {res.meta.total === 0 ? "0 apartments" : `${res.meta.total} apartments`}
          </p>
        </div>

        {activeTags.length > 0 && (
          <div className="-mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:mb-6 sm:flex-wrap sm:gap-2 sm:overflow-visible sm:px-0">
            {activeTags.map((tag) => (
              <span
                key={tag}
                className="shrink-0 rounded-full border border-brand-100 bg-brand-50/70 px-2.5 py-1 text-xs font-medium text-brand-800 sm:px-3 sm:py-1.5"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-3 lg:flex-row lg:gap-8">
          <div className="w-full shrink-0 lg:w-80">
            <Suspense fallback={null}>
              <ProjectFilterSidebar />
            </Suspense>
          </div>

          <div className="min-w-0 flex-1">
            <p className="mb-2 text-xs font-medium text-muted-foreground sm:hidden">
              {res.meta.total === 0 ? "0 apartments" : `${res.meta.total} apartments`}
            </p>
            <h2 className="sr-only">Apartment projects</h2>
            {res.data.length === 0 ? (
              <EmptyState
                icon={Building2}
                title="No apartments found"
                description="No apartments match the selected filters."
              />
            ) : (
              <ProjectsInfiniteList
                key={listKey}
                initialProjects={res.data}
                initialPage={res.meta.page}
                totalPages={res.meta.totalPages}
                filters={filters}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

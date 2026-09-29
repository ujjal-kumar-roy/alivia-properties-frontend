import Link from "next/link"
import Image from "next/image"
import { MapPin, Calendar, Building2, ArrowRight, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatPriceRange } from "@/utils/format-price"
import { PROJECT_STATUS_STYLES } from "@/lib/constants"
import { pickLocationText } from "@/utils/project-location"
import { ROUTES } from "@/config/routes.config"
import type { Project, ProjectStatus } from "@/types/project.types"

interface ProjectCardProps {
  project: Project
}

const CARD_GRADIENTS: Record<ProjectStatus, string> = {
  ongoing:   "from-brand-800 via-brand-700 to-brand-600",
  upcoming:  "from-brand-900 via-brand-800 to-gold-700",
  completed: "from-ink-800 via-ink-700 to-brand-700",
}

export function ProjectCard({ project }: ProjectCardProps) {
  const status = PROJECT_STATUS_STYLES[project.status]
  const handover = project.handoverDate
    ? new Intl.DateTimeFormat("en-BD", { month: "short", year: "numeric" }).format(
        new Date(project.handoverDate),
      )
    : "TBA"

  const gradient = CARD_GRADIENTS[project.status] ?? CARD_GRADIENTS.ongoing

  return (
    <article className="surface-card group pressable-lift overflow-hidden">
      <Link href={ROUTES.PROJECT_DETAIL(project.slug)} className="block">
        <div className={`relative h-60 overflow-hidden bg-linear-to-br ${gradient}`}>
          <Image
            src={project.coverImage ?? project.coverImageUrl ?? ""}
            alt={project.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover motion-safe:transition-transform motion-safe:duration-500 group-hover:scale-105 motion-reduce:group-hover:scale-100"
          />
          {/* Dot texture overlay for gradient-only state */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
          <div className="absolute inset-0 bg-linear-to-t from-ink-950 via-ink-950/15 to-transparent" />

          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${status.classes}`}>
              {status.label}
            </span>
            {project.featured && (
              <span className="inline-flex items-center rounded-full border border-gold-200 bg-gold-100 px-2.5 py-1 text-xs font-semibold text-gold-700">
                Featured
              </span>
            )}
          </div>

          {(project.views ?? []).length > 0 && (
            <div className="absolute right-4 top-4 flex max-w-[60%] flex-wrap justify-end gap-1.5">
              {(project.views ?? []).slice(0, 2).map((view) => (
                <span
                  key={view.name}
                  className="inline-flex items-center gap-1 rounded-full bg-gold-400/95 px-2.5 py-1 text-xs font-semibold text-brand-950 shadow-sm"
                >
                  <Eye className="h-3 w-3" />
                  {view.name}
                </span>
              ))}
              {(project.views ?? []).length > 2 && (
                <span className="inline-flex items-center rounded-full bg-brand-950/80 px-2 py-1 text-xs font-semibold text-white">
                  +{(project.views ?? []).length - 2}
                </span>
              )}
            </div>
          )}

          <div className="absolute inset-x-4 bottom-4 text-white">
            <p className="line-clamp-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/70">{project.area}</p>
            <h3 className="mt-2 line-clamp-1 font-sans text-xl font-semibold tracking-tight text-white">{project.name}</h3>
            {project.tagline ? (
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/75">{project.tagline}</p>
            ) : null}
          </div>
        </div>
      </Link>

      <div className="space-y-4 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1.1rem] bg-ink-50 p-3">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-ink-500">Location</p>
            <p className="mt-2 flex items-center gap-2 text-sm font-medium text-ink-800">
              <MapPin className="h-4 w-4 text-brand-600" />
              <span className="truncate">
                {pickLocationText(
                  [project.location, project.area, project.division],
                  "Location available on request",
                )}
              </span>
            </p>
          </div>
          <div className="rounded-[1.1rem] bg-ink-50 p-3">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-ink-500">Inventory</p>
            <p className="mt-2 flex items-center gap-2 text-sm font-medium text-ink-800">
              <Building2 className="h-4 w-4 text-brand-600" />
              {project.totalFloors ?? "—"} floors · {project.totalUnits ?? "—"} units
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-ink-500">
              {project.status === "completed" ? "Completed" : `Handover ${handover}`}
            </p>
            <p className="mt-1 text-sm font-semibold text-brand-700">
              {formatPriceRange(project.priceFrom ?? 0, project.priceTo ?? project.priceFrom ?? 0)}
            </p>
          </div>
          <Link href={ROUTES.PROJECT_DETAIL(project.slug)}>
            <Button size="sm" variant="outline" className="rounded-full border-brand-200 text-brand-700 hover:bg-brand-50">
              Details
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-2 text-xs text-ink-500">
          <Calendar className="h-3.5 w-3.5 text-brand-600" />
          {project.status === "completed" ? "Ready community" : "Phased development timeline"}
        </div>
      </div>
    </article>
  )
}

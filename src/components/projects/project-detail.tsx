import {
  BedDouble,
  Building2,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  FileText,
  Landmark,
  Layers,
  LayoutGrid,
  ListChecks,
  MapPin,
  Maximize2,
  MessageCircle,
  Phone,
  Play,
  Ruler,
  Send,
  Sparkles,
} from "lucide-react"
import Link from "next/link"
import { CardFact } from "@/components/common/card-fact"
import { MobileActionBar } from "@/components/common/mobile-action-bar"
import { AvailabilityMeter } from "@/components/projects/availability-meter"
import { OpenSectionsOnDesktop } from "@/components/projects/open-sections-on-desktop"
import { ProjectAtAGlance } from "@/components/projects/project-at-a-glance"
import {
  collectFloorPlans,
  formatHandover,
  groupLandmarks,
  priceDisplay,
  projectAvailability,
  projectLocationText,
  projectMapEmbedUrl,
} from "@/components/projects/project-detail.utils"
import { ProjectEnquire } from "@/components/projects/project-enquire"
import { buildProjectFacts, numberRange } from "@/components/projects/project-facts"
import { ProjectFloorPlans } from "@/components/projects/project-floor-plans"
import { ProjectGallery } from "@/components/projects/project-gallery"
import { ProjectSection } from "@/components/projects/project-section"
import { ProjectUnitTypes } from "@/components/projects/project-unit-types"
import { StructuredData } from "@/components/seo/structured-data"
import { ROUTES } from "@/config/routes.config"
import { siteConfig } from "@/config/site.config"
import { PROJECT_STATUS_STYLES } from "@/lib/constants"
import { parseProjectDescription } from "@/lib/project-description"
import { resolveVideoLink } from "@/lib/video-link"
import { cn } from "@/lib/utils"
import type { Project } from "@/types/project.types"
import { formatPrice } from "@/utils/format-price"

const SECTIONS_ID = "project-sections"

// btn-glass on a plain white card has nothing behind it to blur, so skip the
// backdrop layer there (same look, one less GPU layer per button).
const FLAT_GLASS = "btn-glass backdrop-blur-none"

/**
 * The apartment detail page body (the route file only fetches and counts the
 * view). Phones and tablets: a swipeable full-bleed gallery, then the facts a
 * buyer decides on (price, beds, size, floors, handover, units left), then
 * everything else as accordions, with the first one open. The primary actions
 * live in the floating <MobileActionBar>. From `lg` it is the original two
 * column page: sections always open in the main column, the sticky aside on the
 * right.
 */
export function ProjectDetail({ project }: { project: Project }) {
  const status = PROJECT_STATUS_STYLES[project.status] ?? PROJECT_STATUS_STYLES.ongoing
  const completed = project.status === "completed"
  const units = project.units ?? []
  const locationText = projectLocationText(project)
  const handoverLong = formatHandover(project.handoverDate, "long")
  const handoverShort = formatHandover(project.handoverDate, "short")
  const price = priceDisplay(project.priceFrom, project.priceTo)
  const availability = projectAvailability(project)

  const galleryImages = Array.from(
    new Set(
      [project.coverImage, ...project.galleryImages].filter((image): image is string =>
        Boolean(image),
      ),
    ),
  )

  const facts = buildProjectFacts({
    address: project.address,
    locationText,
    landSize: project.landSize,
    landSizeUnit: project.landSizeUnit,
    totalFloors: project.totalFloors,
    totalUnits: project.totalUnits,
    availableUnits: project.availableUnits,
    soldUnits: project.soldUnits,
    handover: handoverLong ?? undefined,
    units,
  })

  // The four chips under the price: all drawn from the unit types and project.
  const bedRange = numberRange(units.map((unit) => unit.bedrooms))
  const sizeRange = numberRange(units.map((unit) => unit.size))
  const sizeUnit = units.find((unit) => unit.sizeUnit)?.sizeUnit ?? "sq ft"
  const heroFacts = [
    bedRange ? { key: "beds", icon: BedDouble, text: `${bedRange} Bed` } : null,
    sizeRange ? { key: "size", icon: Maximize2, text: `${sizeRange} ${sizeUnit}` } : null,
    project.totalFloors != null
      ? {
          key: "floors",
          icon: Layers,
          text: `${project.totalFloors} Floor${project.totalFloors === 1 ? "" : "s"}`,
        }
      : null,
    completed || handoverShort
      ? {
          key: "handover",
          icon: CalendarClock,
          text: completed ? "Ready to move in" : `Handover ${handoverShort}`,
        }
      : null,
  ].filter((fact): fact is NonNullable<typeof fact> => fact !== null)

  const aboutProject = parseProjectDescription(project.description)
  const aboutHint =
    aboutProject.paragraphs[0] ??
    (aboutProject.highlights.length > 0
      ? `${aboutProject.highlights.length} highlights`
      : `${aboutProject.specs.length} details`)
  const specificationEntries = Object.entries(project.specifications ?? {})
  const landmarkGroups = groupLandmarks(project.nearbyLandmarks ?? [])
  const views = project.views ?? []
  const amenities = project.amenities ?? []
  const floorPlans = collectFloorPlans(project)
  const mapEmbedUrl = projectMapEmbedUrl(project)

  // Video tour: YouTube/Vimeo/Facebook links embed, a direct file plays inline,
  // any other link becomes a plain outbound button. Uploaded clips always play.
  const videoLink = resolveVideoLink(project.videoUrl)
  const videoEmbed = videoLink?.kind === "embed" ? videoLink.src : null
  const videoFiles = [
    ...(project.videos ?? []),
    ...(videoLink?.kind === "file" ? [videoLink.src] : []),
  ]
  const videoOutbound = videoLink?.kind === "link" ? videoLink.href : null

  const has = {
    units: units.length > 0,
    views: views.length > 0,
    facts: facts.length > 0,
    about:
      aboutProject.specs.length > 0 ||
      aboutProject.highlights.length > 0 ||
      aboutProject.paragraphs.length > 0,
    amenities: amenities.length > 0,
    location: Boolean(mapEmbedUrl),
    floorPlans: floorPlans.length > 0,
    video: Boolean(videoEmbed) || videoFiles.length > 0 || Boolean(videoOutbound),
    landmarks: landmarkGroups.length > 0,
    specs: specificationEntries.length > 0,
  }
  // The first section on the page opens by default; the rest start closed.
  const firstSection = (
    ["units", "views", "facts", "about", "amenities", "location", "floorPlans", "video", "landmarks", "specs"] as const
  ).find((key) => has[key])

  const callHref = `tel:${siteConfig.contact.phoneRaw}`
  const whatsappHref = `https://wa.me/${siteConfig.contact.whatsApp}?text=${encodeURIComponent(
    `I am interested in ${project.name}`,
  )}`

  const schema = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: project.name,
    description: project.description,
    url: `${siteConfig.url}${ROUTES.PROJECT_DETAIL(project.slug)}`,
    image: project.coverImage,
    address: {
      "@type": "PostalAddress",
      addressLocality: project.area,
      addressRegion: project.division,
      addressCountry: "BD",
    },
  }

  return (
    <>
      <StructuredData data={schema} />

      {/* Breadcrumb from tablet up. Phones get a back button over the photo. */}
      <nav aria-label="Breadcrumb" className="hidden border-b border-border bg-ink-50 sm:block">
        <ol className="container-page flex items-center gap-1.5 py-1.5 text-xs text-muted-foreground">
          <li className="inline-flex items-center gap-1.5">
            <Link
              href={ROUTES.HOME}
              className="inline-flex min-h-8 items-center hover:text-foreground"
            >
              Home
            </Link>
            <ChevronRight aria-hidden="true" className="size-3" />
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Link
              href={ROUTES.PROJECTS}
              className="inline-flex min-h-8 items-center hover:text-foreground"
            >
              Apartments
            </Link>
            <ChevronRight aria-hidden="true" className="size-3" />
          </li>
          <li aria-current="page" className="font-medium text-foreground">
            {project.name}
          </li>
        </ol>
      </nav>

      <div className="container-page pb-4 sm:py-6 md:py-8 lg:py-12">
        {galleryImages.length > 0 ? (
          <ProjectGallery images={galleryImages} label={project.name} className="-mx-4 sm:mx-0">
            <Link
              href={ROUTES.PROJECTS}
              aria-label="Back to all apartments"
              className="glass-clear absolute top-3 left-3 z-10 grid size-11 place-items-center rounded-full text-white transition-[scale] duration-150 outline-none focus-visible:ring-2 focus-visible:ring-gold-300 active:scale-95 motion-reduce:transition-none sm:hidden"
            >
              <ChevronLeft aria-hidden="true" className="size-5" />
            </Link>
          </ProjectGallery>
        ) : (
          <Link href={ROUTES.PROJECTS} className={cn(FLAT_GLASS, "mt-3 sm:hidden")}>
            <ChevronLeft aria-hidden="true" className="size-4" />
            All apartments
          </Link>
        )}

        <div className="grid grid-cols-1 gap-x-10 lg:grid-cols-3">
          {/* Main content */}
          <div className="min-w-0 lg:col-span-2">
            <header className="mt-3 sm:mt-0">
              <div className="mb-1.5 flex flex-wrap items-center gap-1.5 sm:mb-2 sm:gap-2">
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                    status.classes,
                  )}
                >
                  {status.label}
                </span>
                {project.featured ? (
                  <span className="rounded-full border border-gold-200 bg-gold-100 px-2.5 py-0.5 text-xs font-semibold text-gold-700">
                    Featured
                  </span>
                ) : null}
              </div>
              <h1 className="line-clamp-2 font-heading text-2xl leading-tight font-bold tracking-tight text-ink-950 sm:line-clamp-none sm:text-3xl md:text-4xl lg:mb-1 lg:text-[clamp(2.5rem,4.5vw,3.75rem)]">
                {project.name}
              </h1>
              {project.tagline ? (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground italic sm:line-clamp-none sm:text-base lg:text-lg lg:leading-relaxed">
                  {project.tagline}
                </p>
              ) : null}
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground sm:mt-2">
                <MapPin aria-hidden="true" className="size-4 shrink-0 text-brand-600" />
                <span className="min-w-0">{locationText}</span>
              </p>
            </header>

            {/* Phones and tablets: what a buyer decides on, before any scrolling.
                Desktop shows the same facts in the sidebar. */}
            <div className="mt-3 space-y-2.5 lg:hidden">
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-ink-500">
                    {price?.isRange ? "Price range" : price ? "Starting from" : "Price"}
                  </p>
                  <p className="text-xl leading-tight font-extrabold tabular-nums text-gold-700">
                    {price ? price.text : "On request"}
                  </p>
                </div>
                {/* The floating bar is hidden from md, so tablets get the actions here. */}
                <div className="hidden shrink-0 items-center gap-2 md:flex">
                  <a
                    href={callHref}
                    aria-label={`Call ${siteConfig.contact.phone}`}
                    className={cn(FLAT_GLASS, "size-11 p-0")}
                  >
                    <Phone aria-hidden="true" className="size-5" />
                  </a>
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Chat on WhatsApp"
                    className={cn(FLAT_GLASS, "size-11 p-0")}
                  >
                    <MessageCircle aria-hidden="true" className="size-5 text-green-700" />
                  </a>
                  <ProjectEnquire
                    projectId={project.id}
                    projectName={project.name}
                    className="btn-tactile btn-tactile--sm"
                  >
                    <Send aria-hidden="true" className="size-4" />
                    Enquire
                  </ProjectEnquire>
                </div>
              </div>

              {heroFacts.length > 0 ? (
                <ul className="flex flex-wrap gap-1.5">
                  {heroFacts.map(({ key, icon, text }) => (
                    <li key={key} className="rounded-full bg-brand-50 px-2.5 py-1">
                      <CardFact icon={icon}>{text}</CardFact>
                    </li>
                  ))}
                </ul>
              ) : null}

              {availability ? (
                <AvailabilityMeter left={availability.left} total={availability.total} />
              ) : null}
            </div>

            <div id={SECTIONS_ID} className="mt-4 space-y-2 lg:mt-8 lg:space-y-8">
              <OpenSectionsOnDesktop containerId={SECTIONS_ID} />

              {/* Unit types and prices */}
              {has.units ? (
                <ProjectSection
                  id="units"
                  title="Unit Types & Pricing"
                  hint={`${units.length} type${units.length === 1 ? "" : "s"}${price ? `, ${price.text}` : ""}`}
                  icon={LayoutGrid}
                  defaultOpen={firstSection === "units"}
                >
                  <ProjectUnitTypes units={units} />
                </ProjectSection>
              ) : null}

              {/* Views & pricing: premium outlooks that lift the price */}
              {has.views ? (
                <ProjectSection
                  id="views"
                  title="Views & Pricing"
                  hint={`${views.length} view option${views.length === 1 ? "" : "s"}`}
                  icon={Eye}
                  defaultOpen={firstSection === "views"}
                >
                  <p className="mb-4 hidden text-sm text-muted-foreground lg:block">
                    Premium outlooks that influence the final price — pick the view that fits your
                    budget.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2 lg:gap-3">
                    {views.map((view) => (
                      <div
                        key={view.name}
                        className="flex items-center justify-between gap-3 rounded-xl border border-gold-200 bg-linear-to-br from-gold-50 via-white to-brand-50/40 px-3 py-2.5 lg:rounded-2xl lg:px-4 lg:py-3.5 lg:shadow-[0_12px_32px_rgba(212,175,55,0.12)]"
                      >
                        <span className="flex min-w-0 items-center gap-2.5 font-semibold text-ink-900">
                          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-700 text-white lg:size-9 lg:rounded-xl">
                            <Eye aria-hidden="true" className="size-4" />
                          </span>
                          <span className="min-w-0 text-sm lg:text-base">{view.name}</span>
                        </span>
                        {view.pricePremium != null && view.pricePremium > 0 ? (
                          <span className="shrink-0 rounded-full bg-gold-400 px-2.5 py-1 text-sm font-bold text-brand-950 tabular-nums">
                            +{formatPrice(view.pricePremium, true)}
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
                            Included
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </ProjectSection>
              ) : null}

              {/* At a glance: phones only here, desktop has it in the sidebar */}
              {has.facts ? (
                <ProjectSection
                  id="facts"
                  title="Apartment at a Glance"
                  hint={`${facts.length} key facts`}
                  icon={ClipboardList}
                  defaultOpen={firstSection === "facts"}
                  className="lg:hidden"
                >
                  <ProjectAtAGlance facts={facts} variant="grid" />
                </ProjectSection>
              ) : null}

              {/* Description */}
              {has.about ? (
                <ProjectSection
                  id="about"
                  title="About This Apartment"
                  hint={aboutHint}
                  icon={FileText}
                  defaultOpen={firstSection === "about"}
                >
                  <p className="mb-4 hidden text-sm text-muted-foreground lg:block">
                    A cleaner overview of the key details, layout, and standout project points.
                  </p>
                  <div className="space-y-3 lg:space-y-5 lg:rounded-[1.75rem] lg:border lg:border-border lg:bg-linear-to-br lg:from-white lg:via-ink-50/60 lg:to-white lg:p-6">
                    {aboutProject.specs.length > 0 ? (
                      <div className="grid grid-cols-2 gap-1.5 lg:gap-3">
                        {aboutProject.specs.map((item) => (
                          <div
                            key={`${item.label}-${item.value}`}
                            className={cn(
                              "min-w-0 rounded-xl bg-ink-50 px-3 py-2 lg:rounded-[1.25rem] lg:border lg:border-border/80 lg:bg-white/90 lg:p-4 lg:shadow-[0_16px_40px_rgba(15,23,42,0.04)]",
                              // Short values pair up two to a row; long ones (an address) take the full width.
                              item.value.length > 26 && "col-span-2",
                            )}
                          >
                            <p className="text-xs font-semibold tracking-wide text-brand-700 uppercase lg:tracking-[0.18em]">
                              {item.label}
                            </p>
                            <p className="mt-0.5 text-sm leading-snug text-ink-800 lg:mt-2 lg:leading-6">
                              {item.value}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {aboutProject.highlights.length > 0 ? (
                      <div>
                        <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase lg:mb-3 lg:tracking-[0.18em]">
                          Highlights
                        </p>
                        <div className="flex flex-wrap gap-1.5 lg:gap-2">
                          {aboutProject.highlights.map((item) => (
                            <span
                              key={item}
                              className="inline-flex items-center rounded-full border border-brand-100 bg-brand-50/70 px-2.5 py-1 text-xs font-medium text-brand-800 lg:px-3 lg:py-1.5"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {aboutProject.paragraphs.length > 0 ? (
                      <div className="space-y-2.5 lg:space-y-3">
                        {aboutProject.paragraphs.map((paragraph) => (
                          <p
                            key={paragraph}
                            className="text-[0.9375rem] leading-relaxed text-ink-600 lg:text-sm"
                          >
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </ProjectSection>
              ) : null}

              {/* Amenities */}
              {has.amenities ? (
                <ProjectSection
                  id="amenities"
                  title="Amenities"
                  hint={
                    amenities.length > 2
                      ? `${amenities.slice(0, 2).join(", ")} +${amenities.length - 2}`
                      : amenities.join(", ")
                  }
                  icon={Sparkles}
                  defaultOpen={firstSection === "amenities"}
                >
                  <ul className="flex flex-wrap gap-1.5 lg:gap-2">
                    {amenities.map((amenity) => (
                      <li
                        key={amenity}
                        className="rounded-full bg-brand-50 px-2.5 py-1 text-[0.8125rem] font-semibold text-brand-800 lg:px-3 lg:py-1.5 lg:text-sm"
                      >
                        {amenity}
                      </li>
                    ))}
                  </ul>
                </ProjectSection>
              ) : null}

              {/* Location map */}
              {mapEmbedUrl ? (
                <ProjectSection
                  id="location"
                  title="Location Map"
                  hint={locationText}
                  icon={MapPin}
                  defaultOpen={firstSection === "location"}
                >
                  <p className="mb-2 flex items-center gap-1.5 text-sm text-ink-600 lg:hidden">
                    <MapPin aria-hidden="true" className="size-4 shrink-0 text-brand-600" />
                    {locationText}
                  </p>
                  <iframe
                    src={mapEmbedUrl}
                    title={`${project.name} location map`}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    className="h-56 w-full rounded-xl border border-border bg-ink-50 sm:h-72 lg:h-80"
                  />
                </ProjectSection>
              ) : null}

              {/* Floor plans */}
              {has.floorPlans ? (
                <ProjectSection
                  id="floor-plans"
                  title="Floor Plans"
                  hint={`${floorPlans.length} plan${floorPlans.length === 1 ? "" : "s"}`}
                  icon={Ruler}
                  defaultOpen={firstSection === "floorPlans"}
                >
                  <ProjectFloorPlans plans={floorPlans} label={project.name} />
                </ProjectSection>
              ) : null}

              {/* 360° virtual tour temporarily disabled on the frontend — map option stays enabled.
              import { VirtualTour } from "@/components/properties/virtual-tour"
              <VirtualTour
                posterImage={galleryImages[0]}
                panoramaUrl={project.panoramaUrl}
                title="Virtual 360° Tour"
              />
              */}

              {/* Video tour */}
              {has.video ? (
                <ProjectSection
                  id="video"
                  title="Video Tour"
                  hint="Watch the walkthrough"
                  icon={Play}
                  defaultOpen={firstSection === "video"}
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    {videoEmbed ? (
                      <div className="relative aspect-video overflow-hidden rounded-xl border border-border sm:col-span-2">
                        <iframe
                          src={videoEmbed}
                          title={`${project.name} video tour`}
                          loading="lazy"
                          className="absolute inset-0 h-full w-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    ) : null}
                    {videoFiles.map((src, index) => (
                      <video
                        key={`${src}-${index}`}
                        src={src}
                        controls
                        playsInline
                        preload="none"
                        className="aspect-video w-full rounded-xl border border-border bg-black object-cover"
                      />
                    ))}
                    {videoOutbound ? (
                      <a
                        href={videoOutbound}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-glass sm:col-span-2"
                      >
                        <Play aria-hidden="true" className="size-4" />
                        Watch the video
                      </a>
                    ) : null}
                  </div>
                </ProjectSection>
              ) : null}

              {/* Nearby */}
              {has.landmarks ? (
                <ProjectSection
                  id="nearby"
                  title="Landmarks Nearby"
                  hint={`${(project.nearbyLandmarks ?? []).length} places`}
                  icon={Landmark}
                  defaultOpen={firstSection === "landmarks"}
                >
                  <div className="space-y-3 lg:space-y-6">
                    {landmarkGroups.map(({ group, names }) => (
                      <div key={group}>
                        <p className="text-eyebrow mb-1.5 lg:mb-2">{group}</p>
                        <ul className="flex flex-wrap gap-1.5 lg:gap-2">
                          {names.map((name, index) => (
                            <li
                              key={`${name}-${index}`}
                              className="inline-flex items-center gap-1.5 rounded-full border border-ink-100 bg-white px-2.5 py-1 text-[0.8125rem] font-medium text-ink-800 lg:text-sm"
                            >
                              <MapPin aria-hidden="true" className="size-3.5 shrink-0 text-brand-600" />
                              {name}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </ProjectSection>
              ) : null}

              {/* Specifications */}
              {has.specs ? (
                <ProjectSection
                  id="specifications"
                  title="Specifications"
                  hint={`${specificationEntries.length} details`}
                  icon={ListChecks}
                  defaultOpen={firstSection === "specs"}
                >
                  <dl className="overflow-hidden rounded-xl border border-border">
                    {specificationEntries.map(([key, value], index) => (
                      <div
                        key={key}
                        className={cn(
                          "grid grid-cols-2 gap-3 px-3 py-2.5 text-sm lg:px-4 lg:py-3",
                          index % 2 === 0 ? "bg-ink-50" : "bg-white",
                        )}
                      >
                        <dt className="font-medium text-muted-foreground">{key}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                </ProjectSection>
              ) : null}

              {/* Developer: a compact row on phones; desktop has the sidebar card */}
              {project.developerName ? (
                <div className="flex items-center gap-3 rounded-2xl border border-brand-200 bg-linear-to-br from-brand-50 via-white to-gold-50 p-3 lg:hidden">
                  <div className="relative inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-700 text-white">
                    <Building2 aria-hidden="true" className="size-5" />
                    <Sparkles
                      aria-hidden="true"
                      className="absolute -top-1.5 -right-1.5 size-4 text-gold-500"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold tracking-wide text-brand-700 uppercase">
                      Developed by
                    </p>
                    <p className="leading-snug font-bold wrap-break-word text-ink-950">
                      {project.developerName}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Sidebar: sticky on desktop; on phones only the contact card shows */}
          <aside className="mt-4 lg:mt-0">
            <div className="space-y-5 lg:sticky lg:top-24">
              {project.developerName ? (
                <section className="relative isolate hidden overflow-hidden rounded-2xl border border-brand-200 bg-linear-to-br from-brand-50 via-white to-gold-50 p-5 shadow-[0_0_0_1px_rgba(5,150,105,0.04),0_18px_60px_rgba(5,150,105,0.16),0_0_45px_rgba(212,175,55,0.12)] lg:block">
                  <div className="absolute -top-12 -right-12 -z-10 size-36 rounded-full bg-gold-300/25 blur-3xl" />
                  <div className="absolute -bottom-16 -left-10 -z-10 size-40 rounded-full bg-brand-300/25 blur-3xl" />
                  <div className="flex items-start gap-3">
                    <div className="relative inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-700 text-white shadow-[0_8px_24px_rgba(5,150,105,0.28)]">
                      <Building2 aria-hidden="true" className="size-5" />
                      <Sparkles
                        aria-hidden="true"
                        className="absolute -top-1.5 -right-1.5 size-4 text-gold-500"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold tracking-[0.2em] text-brand-700 uppercase">
                        Developed by
                      </p>
                      <p className="mt-1 text-lg leading-snug font-bold wrap-break-word text-ink-950">
                        {project.developerName}
                      </p>
                      <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                        The team responsible for bringing this project to life.
                      </p>
                    </div>
                  </div>
                </section>
              ) : null}

              <div className="hidden lg:block">
                <ProjectAtAGlance facts={facts} />
              </div>

              {/* Price card */}
              <div className="hidden space-y-2 rounded-2xl bg-brand-700 p-5 text-white lg:block">
                <p className="text-sm text-brand-200">Price Range</p>
                <p className="text-2xl font-bold tabular-nums">{price ? price.text : "On request"}</p>
                <p className="text-xs text-brand-200">Prices may vary per unit type and floor</p>
              </div>

              {/* Contact card (the #enquire anchor) */}
              <div
                id="enquire"
                className="scroll-mt-24 rounded-2xl border border-border bg-white p-4 shadow-(--shadow-card) lg:p-5"
              >
                <h3 className="font-heading text-lg font-semibold text-ink-900">
                  Enquire About This Apartment
                </h3>
                <div className="mt-3 space-y-2">
                  <ProjectEnquire
                    projectId={project.id}
                    projectName={project.name}
                    className="btn-tactile btn-tactile--block"
                  >
                    <Send aria-hidden="true" className="size-4" />
                    Send an enquiry
                  </ProjectEnquire>
                  {/* Phones already have call and WhatsApp in the floating bar. */}
                  <div className="hidden grid-cols-2 gap-2 md:grid lg:grid-cols-1">
                    <a href={callHref} className={FLAT_GLASS}>
                      <Phone aria-hidden="true" className="size-4" />
                      {siteConfig.contact.phone}
                    </a>
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={FLAT_GLASS}
                    >
                      <MessageCircle aria-hidden="true" className="size-4 text-green-700" />
                      WhatsApp
                    </a>
                  </div>
                  <Link
                    href={`${ROUTES.CONSULTATION}?project=${project.slug}`}
                    className={cn(FLAT_GLASS, "w-full")}
                  >
                    Book Site Visit
                  </Link>
                </div>
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  {siteConfig.contact.officeHours}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Phones: the next step always one thumb-tap away. */}
      <MobileActionBar label={`Contact about ${project.name}`}>
        <a
          href={callHref}
          aria-label={`Call ${siteConfig.contact.phone}`}
          className="btn-glass size-11 shrink-0 p-0"
        >
          <Phone aria-hidden="true" className="size-5" />
        </a>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat on WhatsApp"
          className="btn-glass size-11 shrink-0 p-0"
        >
          <MessageCircle aria-hidden="true" className="size-5 text-green-700" />
        </a>
        <ProjectEnquire
          projectId={project.id}
          projectName={project.name}
          className="btn-tactile flex-1"
        >
          <Send aria-hidden="true" className="size-4" />
          Enquire
        </ProjectEnquire>
      </MobileActionBar>
    </>
  )
}

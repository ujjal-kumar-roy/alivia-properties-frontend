import { MorphPlaceholder } from "@/components/common/morph-placeholder"
import { ProjectDetailSkeleton } from "@/components/projects/project-detail-skeleton"

/**
 * The apartment detail skeleton, plus the tapped card's photo over its hero
 * block so the card morphs into the hero slot (see MorphPlaceholder). The
 * overlay repeats the skeleton's offset to that block: the breadcrumb row from
 * `sm` (44px + 1px border), then the page's top padding. Without a tapped card
 * the overlay is empty and the plain skeleton shows.
 */
export default function Loading() {
  return (
    <div className="relative">
      <ProjectDetailSkeleton />
      <div className="pointer-events-none absolute inset-x-0 top-0 sm:pt-11.25">
        <div className="container-page sm:pt-6 md:pt-8 lg:pt-12">
          <MorphPlaceholder
            skeleton={false}
            className="-mx-4 aspect-4/3 max-h-[64svh] rounded-none sm:mx-0 sm:aspect-16/10 sm:max-h-none sm:rounded-[1.5rem] md:aspect-16/8.5"
          />
        </div>
      </div>
    </div>
  )
}

import { MorphPlaceholder } from "@/components/common/morph-placeholder"
import { Sk } from "@/components/common/skeletons"
import { ProjectDetailSkeleton } from "@/components/projects/project-detail-skeleton"

/*
 * Detail page loading shapes with the morph photo slot (MorphPlaceholder).
 * Each detail route's own loading.tsx renders one, and so do the listing,
 * site and root loading files (through MorphLoading) when a card for that
 * detail page was just tapped, because Next may commit any of them first.
 */

/**
 * The apartment detail skeleton, plus the tapped card's photo over its hero
 * block. The overlay repeats ProjectDetailSkeleton's offset to that block: the
 * breadcrumb row from `sm` (44px + 1px border), then the page's top padding.
 * Without a tapped card the overlay is empty and the plain skeleton shows.
 */
export function ApartmentDetailLoading() {
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

/** The photo stage: full-bleed 4:3 on phones, a 16:9 card on tablets, 400px tall from lg. */
const HERO_BOX =
  "-mx-4 aspect-4/3 rounded-none sm:mx-0 sm:aspect-video sm:rounded-3xl lg:aspect-auto lg:h-100 lg:rounded-[1.5rem]"

/** A closed accordion row (a DetailSection on phones and tablets). */
function SectionRow() {
  return (
    <div className="flex min-h-12 items-center gap-3 rounded-2xl border border-black/5 bg-white px-3 py-2 shadow-(--shadow-card)">
      <Sk className="size-9 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Sk className="h-3.5 w-2/5" />
        <Sk className="h-3 w-3/5" />
      </div>
      <Sk className="size-5 shrink-0 rounded-md" />
    </div>
  )
}

/**
 * Loading shape of the property detail page, mirroring its layout so nothing
 * jumps when the page arrives. Phones: the full-bleed 4:3 photo first, then
 * badges, title, price, address, the two-column key facts and the accordions.
 * From `lg`: title left, the 400px photo stage and thumbnails right, then the
 * sections beside the sticky sidebar. The photo slot takes the tapped card's
 * photo, so the card morphs straight into it.
 */
export function PropertyDetailLoading() {
  return (
    <>
      <div className="hidden border-b border-border bg-ink-50 sm:block">
        <div className="container-page flex min-h-11 items-center gap-2">
          <Sk className="h-3 w-10" />
          <Sk className="h-3 w-16" />
          <Sk className="h-3 w-28" />
        </div>
      </div>

      <div className="container-page section-y pt-2 sm:pt-10">
        <div className="grid gap-3 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:gap-8">
          <div className="order-2 min-w-0 space-y-3 lg:order-0 lg:space-y-6">
            <div className="space-y-2 lg:space-y-4">
              <div className="flex gap-1.5 lg:gap-2">
                <Sk className="h-6.5 w-20 rounded-full" />
                <Sk className="h-6.5 w-20 rounded-full" />
              </div>
              <div>
                <Sk className="h-7 w-11/12 sm:h-12" />
                <Sk className="mt-1 h-7 w-3/5 sm:h-12" />
                <Sk className="mt-2 h-8 w-48 sm:mt-3 sm:h-9" />
                <Sk className="mt-2 h-4 w-4/5 sm:mt-3" />
                <Sk className="mt-1 h-4 w-2/5 sm:hidden" />
              </div>
            </div>

            {/* Views, pricing and type cards (desktop) */}
            <div className="hidden grid-cols-3 gap-2.5 lg:grid">
              {Array.from({ length: 3 }).map((_, index) => (
                <Sk key={index} className="h-19 rounded-2xl" />
              ))}
            </div>

            {/* Key facts, two to a row (phones and tablets) */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:hidden">
              {Array.from({ length: 6 }).map((_, index) => (
                <Sk key={index} className="h-12.5 rounded-xl" />
              ))}
            </div>
          </div>

          <div className="order-1 min-w-0 lg:order-0">
            <MorphPlaceholder className={HERO_BOX} />
            <div className="mt-3 hidden gap-2.5 pb-1 lg:flex">
              {Array.from({ length: 4 }).map((_, index) => (
                <Sk key={index} className="aspect-4/3 w-24 shrink-0 rounded-xl" />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2.5 lg:mt-10 lg:grid-cols-[1.3fr_0.7fr] lg:gap-10">
          <div className="min-w-0 space-y-2.5 lg:space-y-8">
            {/* Spec cards (desktop) */}
            <div className="hidden grid-cols-4 gap-4 lg:grid">
              {Array.from({ length: 4 }).map((_, index) => (
                <Sk key={index} className="h-26 rounded-2xl" />
              ))}
            </div>

            {/* Description, open */}
            <div className="rounded-2xl border border-black/5 bg-white shadow-(--shadow-card) lg:rounded-3xl lg:p-5">
              <div className="flex min-h-12 items-center gap-3 px-3 py-2 lg:min-h-0 lg:p-0">
                <Sk className="size-9 shrink-0 rounded-xl lg:size-10 lg:rounded-2xl" />
                <Sk className="h-4 w-32 lg:h-8 lg:w-56" />
              </div>
              <div className="space-y-2 border-t border-ink-100 p-3 lg:border-0 lg:px-0 lg:pb-0 lg:pt-4">
                <Sk className="h-4 w-full" />
                <Sk className="h-4 w-11/12" />
                <Sk className="h-4 w-full" />
                <Sk className="h-4 w-3/5" />
              </div>
            </div>

            {Array.from({ length: 4 }).map((_, index) => (
              <SectionRow key={index} />
            ))}
          </div>

          {/* Price snapshot and contact card (desktop sidebar) */}
          <div className="hidden space-y-4 lg:block">
            <Sk className="h-44 w-full rounded-2xl" />
            <Sk className="h-96 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </>
  )
}

/**
 * The site header's height, for a detail skeleton shown by the root loading
 * file, which sits outside the (site) layout and its header: keeps the photo
 * slot where it lands once the layout (and the real header) arrives.
 */
export function SiteHeaderSpace() {
  return <div aria-hidden="true" className="h-[79px] shrink-0 md:h-[131px]" />
}

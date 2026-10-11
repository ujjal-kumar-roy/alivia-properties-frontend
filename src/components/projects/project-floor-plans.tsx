"use client"

import Image from "next/image"
import { useState } from "react"
import { Maximize2 } from "lucide-react"
import { ProjectLightbox } from "@/components/projects/project-image-lightbox-button"
import type { FloorPlanItem } from "./project-detail.utils"

/**
 * Floor plans as a swipeable row of cards on phones (one and a bit visible, so
 * the next one invites a swipe) and a two column grid from `lg`. Tapping a plan
 * opens it in the same full-screen viewer as the photos, where it can be
 * zoomed and rotated.
 */
export function ProjectFloorPlans({
  plans,
  label,
}: {
  plans: FloorPlanItem[]
  label: string
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <>
      <ul className="-mx-3 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-3 pb-1 [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-2 lg:gap-4 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
        {plans.map((plan, index) => (
          <li key={plan.id} className="w-[74%] shrink-0 snap-start sm:w-64 lg:w-auto">
            <button
              type="button"
              onClick={() => setOpenIndex(index)}
              aria-label={`View ${plan.label} floor plan full screen`}
              className="block w-full rounded-xl text-left outline-none transition-[scale] duration-150 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 active:scale-[0.98] motion-reduce:transition-none"
            >
              <span className="relative block aspect-4/3 overflow-hidden rounded-xl border border-ink-100 bg-white">
                <Image
                  src={plan.imageUrl}
                  alt={`${plan.label} floor plan`}
                  fill
                  sizes="(min-width: 1024px) 400px, 74vw"
                  className="object-contain p-1.5"
                />
                <span
                  aria-hidden="true"
                  className="absolute top-2 right-2 grid size-8 place-items-center rounded-full bg-ink-900/70 text-white"
                >
                  <Maximize2 className="size-4" />
                </span>
              </span>
              <span className="mt-1.5 block text-[0.8125rem] leading-snug font-semibold text-ink-900">
                {plan.label}
              </span>
              {plan.meta ? <span className="block text-xs text-ink-500">{plan.meta}</span> : null}
            </button>
          </li>
        ))}
      </ul>

      <ProjectLightbox
        open={openIndex !== null}
        onOpenChange={(open) => {
          if (!open) setOpenIndex(null)
        }}
        images={plans.map((plan) => plan.imageUrl)}
        startIndex={openIndex ?? 0}
        label={`${label} floor plans`}
      />
    </>
  )
}

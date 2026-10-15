import { ApartmentDetailLoading } from "@/components/common/detail-loading"
import { MorphLoading } from "@/components/common/morph-placeholder"
import { Sk } from "@/components/common/skeletons"

/**
 * One apartment card while the list loads. Phones get the compact row the real
 * card uses (100px square photo on the left, four short lines on the right);
 * from `sm` it is the vertical card.
 */
function ApartmentCardSkeleton() {
  return (
    <div className="flex min-w-0 gap-2.5 rounded-2xl border border-black/5 bg-white p-2 shadow-(--shadow-card) sm:block sm:overflow-hidden sm:rounded-3xl sm:p-0">
      <Sk className="aspect-square w-25 shrink-0 self-start rounded-xl sm:aspect-16/10 sm:w-full sm:self-auto sm:rounded-none" />
      <div className="min-w-0 flex-1 space-y-2 py-0.5 sm:space-y-2.5 sm:p-4">
        <Sk className="h-4 w-3/5 sm:h-5" />
        <Sk className="h-3 w-2/5" />
        <div className="flex gap-2.5">
          <Sk className="h-3 w-12" />
          <Sk className="h-3 w-16" />
          <Sk className="h-3 w-14" />
        </div>
        <Sk className="h-4 w-1/3" />
      </div>
    </div>
  )
}

/**
 * The listings skeleton. Next can commit it first on the way to an apartment
 * page too (it is the boundary around the detail segment), so right after an
 * apartment card was tapped it shows the detail skeleton instead.
 */
export default function Loading() {
  return (
    <MorphLoading detail={{ apartment: <ApartmentDetailLoading /> }}>
      <div className="py-3 md:py-12">
        <div className="container-page">
          {/* Title and intro */}
          <div className="space-y-2 sm:space-y-4">
            <Sk className="h-7 w-52 sm:h-10 sm:w-80" />
            <Sk className="h-4 w-full max-w-lg" />
          </div>

          {/* Status chips: one row of 36px pills */}
          <div className="-mx-4 mt-3 mb-3 flex gap-1.5 overflow-hidden px-4 sm:mx-0 sm:mt-8 sm:mb-6 sm:gap-2 sm:px-0">
            {Array.from({ length: 4 }).map((_, index) => (
              <Sk key={index} className="h-9 w-20 shrink-0 rounded-full sm:h-11 sm:w-28" />
            ))}
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:gap-8">
            {/* Filters bar on phones, the sidebar panel on desktop */}
            <div className="w-full shrink-0 lg:w-80">
              <Sk className="h-10 w-full rounded-full lg:h-[26rem] lg:rounded-[1.75rem]" />
            </div>

            <div className="min-w-0 flex-1">
              <Sk className="mb-2 h-3 w-24 sm:hidden" />
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-6">
                {Array.from({ length: 8 }).map((_, index) => (
                  <ApartmentCardSkeleton key={index} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MorphLoading>
  )
}

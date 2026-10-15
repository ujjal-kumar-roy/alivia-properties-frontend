import { PropertyDetailLoading } from "@/components/common/detail-loading"
import { MorphLoading } from "@/components/common/morph-placeholder"
import { Sk, SkPropertyGrid, SkPropertyListingPage } from "@/components/common/skeletons"

/**
 * The listings skeleton. Next can commit it first on the way to a property
 * page too (it is the boundary around the detail segment), so right after a
 * property card was tapped it shows the detail skeleton instead.
 */
export default function Loading() {
  return (
    <MorphLoading detail={{ property: <PropertyDetailLoading /> }}>
      {/* Phones: the compact header and rows, so nothing jumps when the page arrives. */}
      <div className="container-page pb-6 pt-2 sm:hidden">
        <div className="flex items-center justify-between gap-3">
          <Sk className="h-6 w-28" />
          <Sk className="h-4 w-20" />
        </div>
        <div className="-mx-4 mt-2.5 flex gap-1.5 overflow-hidden px-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Sk key={i} className="h-9 w-20 shrink-0 rounded-full" />
          ))}
        </div>
        <div className="mt-2.5 flex gap-2">
          <Sk className="h-10 flex-1 rounded-full" />
          <Sk className="h-10 flex-1 rounded-full" />
        </div>
        <div className="mt-3">
          <SkPropertyGrid count={5} />
        </div>
      </div>
      <div className="hidden sm:block">
        <SkPropertyListingPage />
      </div>
    </MorphLoading>
  )
}

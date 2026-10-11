import { Sk } from "@/components/common/skeletons"

/**
 * Loading shape for the short lead-form pages (contact, consultation): a title
 * and two lines, then a card of fields, sized like the real compact phone page
 * so nothing jumps when the content arrives.
 */
export function FormPageSkeleton({ fields = 5 }: { fields?: number }) {
  return (
    <div className="py-4 sm:py-8 lg:py-12" aria-busy="true">
      <div className="container-page">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 lg:gap-x-12 lg:gap-y-8">
          <div className="space-y-2 lg:col-span-2 lg:row-start-1">
            <Sk className="h-7 w-48 sm:h-9" />
            <Sk className="h-4 w-full max-w-md" />
            <Sk className="h-4 w-3/4 max-w-sm" />
          </div>
          <div className="lg:col-span-3 lg:col-start-3 lg:row-start-1">
            <div className="space-y-3.5 rounded-2xl border border-black/5 bg-white p-3.5 shadow-(--shadow-card) sm:p-6">
              <Sk className="h-5 w-44" />
              {Array.from({ length: fields }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Sk className="h-3.5 w-24" />
                  <Sk className="h-11 w-full rounded-xl" />
                </div>
              ))}
              <Sk className="h-12 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

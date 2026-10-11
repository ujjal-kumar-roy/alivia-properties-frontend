import { Sk } from "@/components/common/skeletons"

export default function Loading() {
  return (
    <div className="py-4 sm:py-8 lg:py-12" aria-busy="true">
      <div className="container-page">
        <div className="mb-3 space-y-2 sm:mb-6">
          <Sk className="h-7 w-56 sm:h-9" />
          <Sk className="h-4 w-4/5 max-w-md" />
        </div>
        <div className="mb-3 flex gap-1.5 sm:mb-6">
          <Sk className="h-9 w-14 rounded-full" />
          <Sk className="h-9 w-28 rounded-full" />
          <Sk className="h-9 w-24 rounded-full" />
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex gap-2.5 rounded-2xl border border-black/5 bg-white p-2 shadow-(--shadow-card) sm:block sm:overflow-hidden sm:p-0"
            >
              <Sk className="aspect-square w-25 shrink-0 rounded-xl sm:aspect-16/10 sm:w-full sm:rounded-none" />
              <div className="min-w-0 flex-1 space-y-2 py-1 sm:p-4">
                <Sk className="h-4 w-full" />
                <Sk className="h-4 w-3/4" />
                <Sk className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

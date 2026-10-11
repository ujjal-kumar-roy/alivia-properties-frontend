import { Sk } from "@/components/common/skeletons"

export default function Loading() {
  return (
    <div aria-busy="true">
      <div className="bg-ink-900 py-5 sm:py-14 md:py-20">
        <div className="container-page flex max-w-3xl flex-col items-center gap-2">
          <Sk className="h-7 w-64 bg-white/10 sm:h-10" />
          <Sk className="h-4 w-full max-w-lg bg-white/10" />
          <Sk className="h-4 w-2/3 max-w-sm bg-white/10" />
        </div>
      </div>
      <div className="container-page grid gap-2.5 py-4 sm:py-10 md:grid-cols-2 md:gap-10">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="space-y-2 rounded-2xl border border-black/5 bg-white p-3.5 shadow-(--shadow-card)">
            <Sk className="h-9 w-9 rounded-xl" />
            <Sk className="h-4 w-full" />
            <Sk className="h-4 w-5/6" />
            <Sk className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  )
}

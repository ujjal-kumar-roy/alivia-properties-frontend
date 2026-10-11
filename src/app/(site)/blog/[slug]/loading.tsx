import { Sk } from "@/components/common/skeletons"

export default function Loading() {
  return (
    <div className="py-4 sm:py-8 lg:py-12" aria-busy="true">
      <div className="container-page max-w-4xl">
        <Sk className="mb-3 h-9 w-40 rounded-full" />
        <Sk className="h-7 w-full sm:h-10" />
        <Sk className="mt-2 h-7 w-2/3 sm:h-10" />
        <Sk className="mb-4 mt-3 h-4 w-64" />
        <Sk className="mb-5 aspect-video w-full rounded-2xl md:aspect-auto md:h-96" />
        <div className="mx-auto max-w-[68ch] space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Sk key={i} className={i % 3 === 2 ? "h-4 w-2/3" : "h-4 w-full"} />
          ))}
        </div>
      </div>
    </div>
  )
}

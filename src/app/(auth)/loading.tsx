import { Sk } from "@/components/common/skeletons"

// Renders inside the auth layout's glass card, so it is only the card's content.
export default function Loading() {
  return (
    <div className="space-y-3.5" aria-busy="true">
      <div className="space-y-2 text-center">
        <Sk className="mx-auto h-6 w-40" />
        <Sk className="mx-auto h-4 w-56" />
      </div>
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Sk className="h-3.5 w-20" />
          <Sk className="h-11 w-full rounded-xl" />
        </div>
      ))}
      <Sk className="h-12 w-full rounded-2xl" />
    </div>
  )
}

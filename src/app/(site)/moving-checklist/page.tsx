import { MovingChecklist } from "@/components/properties/moving-checklist"

export const metadata = {
  title: "Moving Checklist — Alivia Properties",
  description: "Track every task from offer to move-in. Saved in your browser.",
}

export default function MovingChecklistPage() {
  return (
    <div className="py-4 sm:py-8 lg:py-12">
      <div className="container-page max-w-3xl">
        <div className="mb-3 sm:mb-6">
          <p className="text-eyebrow mb-2 hidden sm:block">Plan ahead</p>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl lg:text-4xl">
            Moving checklist
          </h1>
          <p className="mt-1.5 text-[0.9375rem] leading-snug text-ink-600 sm:text-sm">
            16 tasks across 8 weeks. Tap to check off. Progress saves automatically in your browser.
          </p>
        </div>
        <MovingChecklist />
      </div>
    </div>
  )
}

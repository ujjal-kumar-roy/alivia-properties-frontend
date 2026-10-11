import { CompareView } from "@/pages-sections/properties/compare-view"

export default function ComparePage() {
  return (
    <div className="section-y pt-2 sm:pt-12">
      <div className="container-page">
        <div className="mb-3 sm:mb-8">
          <p className="text-eyebrow mb-2 hidden sm:block">Side-by-Side</p>
          <h1 className="font-heading text-xl font-bold tracking-tight sm:text-3xl md:text-4xl">
            Compare Properties
          </h1>
        </div>
        <CompareView />
      </div>
    </div>
  )
}

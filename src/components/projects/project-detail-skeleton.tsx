import { Sk } from "@/components/common/skeletons"

function SectionRow() {
  return (
    <div className="flex min-h-12 items-center gap-2.5 rounded-2xl border border-black/5 bg-white px-3 py-2 shadow-(--shadow-card)">
      <Sk className="size-8 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Sk className="h-3.5 w-2/5" />
        <Sk className="h-3 w-3/5" />
      </div>
      <Sk className="size-5 shrink-0 rounded-md" />
    </div>
  )
}

/**
 * Loading shape of the apartment detail page. It mirrors the real layout: a
 * full-bleed 4:3 photo, badges, title, address, price, fact chips and the
 * units-left bar on phones, then an open accordion (two unit cards) and four
 * closed ones. From `lg` it becomes the two column page with the sidebar.
 */
export function ProjectDetailSkeleton() {
  return (
    <>
      <div className="hidden border-b border-border bg-ink-50 sm:block">
        <div className="container-page flex min-h-11 items-center gap-2">
          <Sk className="h-3 w-10" />
          <Sk className="h-3 w-16" />
          <Sk className="h-3 w-24" />
        </div>
      </div>

      <div className="container-page pb-4 sm:py-6 md:py-8 lg:py-12">
        <Sk className="-mx-4 aspect-4/3 max-h-[64svh] w-auto rounded-none sm:mx-0 sm:aspect-16/10 sm:max-h-none sm:w-full sm:rounded-[1.5rem] md:aspect-[16/8.5]" />
        <div className="mt-3 hidden gap-3 sm:flex">
          {Array.from({ length: 4 }).map((_, index) => (
            <Sk key={index} className="aspect-4/3 w-28 shrink-0 rounded-xl sm:w-36" />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-x-10 lg:grid-cols-3">
          <div className="min-w-0 lg:col-span-2">
            <div className="mt-3 space-y-2 sm:mt-6">
              <div className="flex gap-1.5">
                <Sk className="h-6 w-20 rounded-full" />
                <Sk className="h-6 w-20 rounded-full" />
              </div>
              <Sk className="h-7 w-3/5 sm:h-10" />
              <Sk className="h-4 w-4/5" />
              <Sk className="h-4 w-2/5" />
            </div>

            {/* Price, fact chips and units left (phones and tablets) */}
            <div className="mt-3 space-y-2.5 lg:hidden">
              <div className="space-y-1.5">
                <Sk className="h-3 w-20" />
                <Sk className="h-6 w-44" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Sk className="h-7 w-20 rounded-full" />
                <Sk className="h-7 w-32 rounded-full" />
                <Sk className="h-7 w-20 rounded-full" />
                <Sk className="h-7 w-36 rounded-full" />
              </div>
              <div className="space-y-1.5">
                <Sk className="h-3.5 w-44" />
                <Sk className="h-1.5 w-full rounded-full" />
              </div>
            </div>

            {/* Accordions (phones and tablets) */}
            <div className="mt-4 space-y-2 lg:hidden">
              <div className="rounded-2xl border border-black/5 bg-white shadow-(--shadow-card)">
                <div className="flex min-h-12 items-center gap-2.5 px-3 py-2">
                  <Sk className="size-8 shrink-0 rounded-xl" />
                  <Sk className="h-3.5 w-2/5" />
                  <Sk className="ml-auto size-5 shrink-0 rounded-md" />
                </div>
                <div className="space-y-2 px-3 pb-3">
                  <Sk className="h-24 w-full rounded-xl" />
                  <Sk className="h-24 w-full rounded-xl" />
                </div>
              </div>
              {Array.from({ length: 4 }).map((_, index) => (
                <SectionRow key={index} />
              ))}
            </div>

            {/* Sections (desktop) */}
            <div className="mt-8 hidden space-y-8 lg:block">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="space-y-4">
                  <Sk className="h-9 w-72" />
                  <Sk className="h-4 w-full" />
                  <Sk className="h-4 w-5/6" />
                  <Sk className="h-28 w-full rounded-xl" />
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar (desktop) and the contact card */}
          <aside className="mt-4 lg:mt-0">
            <div className="space-y-5">
              <Sk className="hidden h-28 w-full rounded-2xl lg:block" />
              <Sk className="hidden h-96 w-full rounded-2xl lg:block" />
              <Sk className="hidden h-28 w-full rounded-2xl lg:block" />
              <div className="space-y-3 rounded-2xl border border-border bg-white p-4 shadow-(--shadow-card) lg:p-5">
                <Sk className="h-5 w-3/5" />
                <Sk className="h-12 w-full rounded-2xl" />
                <div className="grid grid-cols-2 gap-2">
                  <Sk className="h-10 rounded-full" />
                  <Sk className="h-10 rounded-full" />
                </div>
                <Sk className="h-10 w-full rounded-full" />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}

import { Building2 } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Waiting made into a brand moment instead of a grey spinner: the Alivia mark
 * hops on a soft shadow (see .brand-loader in globals.css; static under reduced
 * motion). Used as the route fallback where a page has no skeleton of its own.
 */
export function BrandLoader({
  label = "Finding the right place for you",
  className,
}: {
  label?: string
  className?: string
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex min-h-[60dvh] flex-col items-center justify-center gap-5 px-6 text-center",
        className,
      )}
    >
      <div className="flex flex-col items-center">
        <span
          aria-hidden="true"
          className="brand-loader flex size-16 items-center justify-center rounded-[28%] bg-linear-to-br from-brand-500 to-brand-800 text-white shadow-lg ring-1 ring-white/25"
        >
          <Building2 className="size-8" strokeWidth={2} />
        </span>
        <span
          aria-hidden="true"
          className="brand-loader-shadow mt-3 block h-2 w-12 rounded-full bg-ink-900/25 blur-[2px]"
        />
      </div>
      <p className="text-sm font-semibold text-ink-600">{label}</p>
    </div>
  )
}

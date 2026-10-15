import { ChevronDown, type LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type DisclosureProps = {
  title: string
  icon?: LucideIcon
  /** Short right-aligned hint, e.g. a count. */
  meta?: string
  defaultOpen?: boolean
  /**
   * From this breakpoint the panel is always expanded and the summary stops
   * acting like a button (CSS only, via ::details-content; browsers without it
   * simply keep the accordion). Phones always get the accordion.
   */
  expandedFrom?: "lg" | "xl"
  children: ReactNode
  className?: string
}

/**
 * A native <details> accordion in a solid card (never glass: it holds body
 * text). Server-renderable, no JS. Detail pages put secondary information in
 * these so the first phone screen stays on the photo, price and action.
 */
export function Disclosure({
  title,
  icon: Icon,
  meta,
  defaultOpen = false,
  expandedFrom,
  children,
  className,
}: DisclosureProps) {
  return (
    <details
      open={defaultOpen}
      className={cn(
        "group rounded-2xl border border-border/70 bg-white shadow-(--shadow-card)",
        // Open/close slides the height (::details-content + interpolate-size).
        // Browsers without them ignore these rules and the panel just toggles.
        // Gated on interpolate-size: engines with ::details-content but without it
        // would flip height at the halfway point, so they keep the plain toggle.
        "[@supports(interpolate-size:allow-keywords)]:[interpolate-size:allow-keywords] [@supports(interpolate-size:allow-keywords)]:[&::details-content]:h-0 [@supports(interpolate-size:allow-keywords)]:[&::details-content]:overflow-clip [@supports(interpolate-size:allow-keywords)]:[&::details-content]:transition-[height,content-visibility] [@supports(interpolate-size:allow-keywords)]:[&::details-content]:duration-300 [@supports(interpolate-size:allow-keywords)]:[&::details-content]:ease-[cubic-bezier(0.32,0.72,0,1)] [@supports(interpolate-size:allow-keywords)]:[&::details-content]:transition-discrete [@supports(interpolate-size:allow-keywords)]:open:[&::details-content]:h-auto [@supports(interpolate-size:allow-keywords)]:motion-reduce:[&::details-content]:transition-none",
        expandedFrom === "lg" &&
          "[@supports(interpolate-size:allow-keywords)]:lg:[&::details-content]:h-auto lg:[&::details-content]:[content-visibility:visible]",
        expandedFrom === "xl" &&
          "[@supports(interpolate-size:allow-keywords)]:xl:[&::details-content]:h-auto xl:[&::details-content]:[content-visibility:visible]",
        className,
      )}
    >
      <summary
        className={cn(
          "flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-2xl px-3.5 py-2.5 text-[0.9375rem] font-bold text-ink-900 outline-none focus-visible:ring-2 focus-visible:ring-brand-400 [&::-webkit-details-marker]:hidden",
          expandedFrom === "lg" && "lg:pointer-events-none lg:cursor-default",
          expandedFrom === "xl" && "xl:pointer-events-none xl:cursor-default",
        )}
      >
        {Icon ? <Icon aria-hidden="true" className="size-4 shrink-0 text-brand-600" /> : null}
        <span className="min-w-0 flex-1">{title}</span>
        {meta ? <span className="shrink-0 text-xs font-semibold text-ink-500">{meta}</span> : null}
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "size-4 shrink-0 text-ink-500 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none",
            expandedFrom === "lg" && "lg:hidden",
            expandedFrom === "xl" && "xl:hidden",
          )}
        />
      </summary>
      <div className="border-t border-border/50 px-3.5 pb-3.5 pt-3">{children}</div>
    </details>
  )
}

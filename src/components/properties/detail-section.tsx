import { ChevronDown, type LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type DetailSectionProps = {
  title: string
  /** One short line under the title ("5 amenities", "Ask the seller anything"). */
  hint?: string
  icon: LucideIcon
  /** Phones: the first section on the page starts open, the rest start closed. */
  defaultOpen?: boolean
  id?: string
  className?: string
  children: ReactNode
}

// `::details-content` lets CSS keep a closed <details> open. Everything that
// depends on it is gated on the same feature query, so a browser without it
// simply keeps the accordion at every width.
const FORCE_OPEN =
  "[@supports(selector(::details-content))]:lg:[&::details-content]:[content-visibility:visible]"

function Heading({ title, hint, icon: Icon }: Pick<DetailSectionProps, "title" | "hint" | "icon">) {
  return (
    <>
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 lg:size-10 lg:rounded-2xl">
        <Icon aria-hidden="true" className="size-[18px] lg:size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <h3 className="truncate font-heading text-[0.95rem] font-semibold leading-tight text-ink-900 lg:text-[clamp(1.25rem,2.6vw,2.25rem)] lg:leading-[1.2] lg:tracking-tight">
          {title}
        </h3>
        {hint ? <span className="mt-0.5 block truncate text-xs text-ink-500">{hint}</span> : null}
      </span>
    </>
  )
}

/**
 * A page section that is an accordion on phones and a plain card from lg.
 *
 * Phones: a native `<details>`, so it works without JavaScript and the page is
 * short until the visitor opens what they want. From lg the content is forced
 * open and the summary is swapped for a static heading, so the desktop page
 * reads exactly like the always-open cards did and there are no dead buttons
 * in the tab order.
 *
 * Server component on purpose: the children (calculators, Q&A, reviews) bring
 * their own client code, this wrapper brings none.
 */
export function DetailSection({
  title,
  hint,
  icon,
  defaultOpen = false,
  id,
  className,
  children,
}: DetailSectionProps) {
  return (
    <details
      id={id}
      open={defaultOpen}
      className={cn(
        "group min-w-0 scroll-mt-20 rounded-2xl border border-black/5 bg-white shadow-(--shadow-card) lg:rounded-3xl lg:p-5",
        FORCE_OPEN,
        className,
      )}
    >
      <summary
        className={cn(
          "flex min-h-12 cursor-pointer list-none items-center gap-3 rounded-2xl px-3 py-2 outline-none select-none [&::-webkit-details-marker]:hidden",
          "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-400",
          "[@supports(selector(::details-content))]:lg:hidden",
        )}
      >
        <Heading title={title} hint={hint} icon={icon} />
        <ChevronDown
          aria-hidden="true"
          className="size-5 shrink-0 text-ink-500 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>

      {/* Desktop heading: shown only when the section is being forced open. */}
      <div className="hidden items-center gap-3 [@supports(selector(::details-content))]:lg:flex">
        <Heading title={title} hint={hint} icon={icon} />
      </div>

      <div className="border-t border-ink-100 px-3 pb-3 pt-3 lg:border-0 lg:px-0 lg:pb-0 lg:pt-4">
        {children}
      </div>
    </details>
  )
}

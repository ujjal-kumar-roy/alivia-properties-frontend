import { ChevronDown, type LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type ProjectSectionProps = {
  id?: string
  title: string
  /** One short line under the title while the section is closed (phones and tablets). */
  hint?: string | null
  icon: LucideIcon
  defaultOpen?: boolean
  className?: string
  children: ReactNode
}

/**
 * One block of the apartment detail page. On phones and tablets it is a
 * `<details>` accordion card (48px summary row, chevron, one-line hint), so a
 * long page becomes a short list the visitor opens on demand. From `lg` it
 * reads as a plain page section again: no card, no chevron, no toggle, content
 * always visible. `::details-content` makes that work even though the element
 * has no `open` attribute on the server (no flash), and
 * <OpenSectionsOnDesktop> then sets `open` so assistive tech agrees.
 *
 * Server component: it needs no JS to expand and collapse.
 */
export function ProjectSection({
  id,
  title,
  hint,
  icon: Icon,
  defaultOpen = false,
  className,
  children,
}: ProjectSectionProps) {
  return (
    <details
      id={id}
      open={defaultOpen}
      className={cn(
        "group/sec scroll-mt-20 rounded-2xl border border-black/5 bg-white shadow-(--shadow-card)",
        "lg:rounded-none lg:border-0 lg:bg-transparent lg:shadow-none lg:details-content:[content-visibility:visible]",
        className,
      )}
    >
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2.5 rounded-2xl px-3 py-2 outline-none transition-colors select-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-400 active:bg-ink-50 lg:pointer-events-none lg:mb-4 lg:min-h-0 lg:px-0 lg:py-0 lg:active:bg-transparent [&::-webkit-details-marker]:hidden">
        <span
          aria-hidden="true"
          className="grid size-8 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 lg:hidden"
        >
          <Icon className="size-[1.125rem]" />
        </span>
        <h2 className="min-w-0 flex-1 font-heading text-[0.95rem] leading-tight font-semibold tracking-normal text-ink-900 lg:text-[clamp(1.25rem,2.6vw,2.25rem)] lg:tracking-tight">
          {title}
          {/* Visual only (aria-hidden keeps it out of the heading's name); gone once open. */}
          {hint ? (
            <span
              aria-hidden="true"
              className="mt-0.5 block truncate font-sans text-xs leading-snug font-normal text-ink-500 group-open/sec:hidden lg:hidden"
            >
              {hint}
            </span>
          ) : null}
        </h2>
        <ChevronDown
          aria-hidden="true"
          className="size-5 shrink-0 text-ink-400 transition-transform duration-200 group-open/sec:rotate-180 motion-reduce:transition-none lg:hidden"
        />
      </summary>
      <div className="px-3 pb-3 lg:px-0 lg:pb-0">{children}</div>
    </details>
  )
}

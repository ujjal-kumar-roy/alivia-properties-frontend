"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

type FormSectionProps = {
  id?: string
  title: string
  /** One short line under the title, shown in the phone accordion row only. */
  hint?: string
  /** Phones: start expanded. From md up the section is always open and has no header row. */
  defaultOpen?: boolean
  /** Set when a field inside has a validation error: a collapsed section opens so the message is seen. */
  invalid?: boolean
  /** Layout classes for the fields inside (a grid, usually). */
  className?: string
  /** No glass card around it: a plain disclosure row on phones and nothing at all from md up (for previews). */
  bare?: boolean
  children: ReactNode
}

/**
 * A group of form fields in a glass card.
 *
 * Phones: a `<details>` accordion, so a long form reads as a short list of named sections.
 * md and up: the plain card with its fields, exactly as before (the header row is hidden and the
 * section is forced open). No JS is needed for the open state: it renders open, and an effect
 * only collapses sections flagged `defaultOpen={false}` on small screens.
 */
export function FormSection({
  id,
  title,
  hint,
  defaultOpen = true,
  invalid = false,
  className,
  bare = false,
  children,
}: FormSectionProps) {
  const ref = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const mq = window.matchMedia("(min-width: 768px)")
    // Keep the section open whenever the screen is wide enough to hide its header row.
    const forceOpenOnWide = () => {
      if (mq.matches) el.open = true
    }
    if (!mq.matches && !defaultOpen) el.open = false
    mq.addEventListener("change", forceOpenOnWide)
    return () => mq.removeEventListener("change", forceOpenOnWide)
  }, [defaultOpen])

  useEffect(() => {
    if (invalid && ref.current) ref.current.open = true
  }, [invalid])

  return (
    <details
      ref={ref}
      id={id}
      open
      className={cn("group scroll-mt-20", bare ? "" : "surface-card p-0 md:p-5")}
    >
      <summary
        className={cn(
          "flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 py-2.5 md:hidden [&::-webkit-details-marker]:hidden",
          bare && "rounded-2xl border border-border/70 bg-white",
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="block font-heading text-[0.9375rem] font-semibold leading-tight text-ink-900">
            {title}
          </span>
          {hint ? <span className="mt-0.5 block truncate text-xs text-ink-500">{hint}</span> : null}
        </span>
        {invalid ? (
          <span className="rounded-full bg-red-50 px-2 py-0.5 text-[0.6875rem] font-semibold text-red-700">
            Needs attention
          </span>
        ) : null}
        <ChevronDown
          aria-hidden
          className="size-5 shrink-0 text-ink-500 transition-transform duration-200 group-open:rotate-180"
        />
      </summary>
      <div className={cn(bare ? "pt-2 md:p-0" : "px-4 pb-4 pt-1 md:p-0", className)}>{children}</div>
    </details>
  )
}

import Link from "next/link"
import { ArrowLeft, type LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** "Back to ..." link with a 44px tap area. */
export function DetailBack({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="-ml-1 inline-flex min-h-11 items-center gap-2 rounded-full px-1 text-sm font-semibold text-brand-700 hover:text-brand-800"
    >
      <ArrowLeft className="size-4" />
      {children}
    </Link>
  )
}

/**
 * The dark header of a record: kind and status on one line, then the title and when it arrived.
 * Tighter on phones so the key facts below it start on the first screen.
 */
export function DetailHero({
  kicker,
  badge,
  title,
  meta,
  leading,
}: {
  kicker?: ReactNode
  badge?: ReactNode
  title: ReactNode
  meta?: ReactNode
  /** Avatar or icon shown to the left of the text. */
  leading?: ReactNode
}) {
  return (
    <div className="border-b border-border/70 bg-ink-950 px-4 py-4 text-white sm:px-5 sm:py-5">
      <div className="flex items-center gap-3 sm:gap-4">
        {leading}
        <div className="min-w-0 flex-1">
          {kicker || badge ? (
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
              {kicker ? (
                <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-brand-100 sm:text-xs sm:tracking-[0.18em]">
                  {kicker}
                </p>
              ) : (
                <span />
              )}
              {badge}
            </div>
          ) : null}
          <h1 className="mt-2 text-xl font-semibold leading-tight sm:mt-3 sm:text-2xl">{title}</h1>
          {meta ? <div className="mt-1.5 text-[0.8125rem] text-white/75 sm:mt-2 sm:text-sm">{meta}</div> : null}
        </div>
      </div>
    </div>
  )
}

/** Two columns on phones, so six facts fit in three short rows. */
export function FactGrid({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn("grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3", className)}>{children}</div>
}

/** One fact tile. With `href` the whole tile is a tap target (mailto:, tel:). */
export function Fact({
  label,
  icon: Icon,
  href,
  wide,
  children,
  className,
}: {
  label: string
  icon?: LucideIcon
  href?: string
  /** Take the full row on phones (long values such as an email). */
  wide?: boolean
  children: ReactNode
  className?: string
}) {
  const classes = cn(
    "block min-w-0 rounded-2xl border border-border bg-white p-3 sm:p-4",
    wide && "col-span-2 sm:col-span-1",
    href && "transition-[background-color,border-color,scale] active:scale-[0.99] hover:border-brand-200 hover:bg-brand-50",
    className,
  )
  const body = (
    <>
      <p className="flex items-center gap-1.5 text-[0.6875rem] font-medium uppercase tracking-[0.1em] text-ink-500 sm:gap-2 sm:text-xs sm:tracking-[0.14em]">
        {Icon ? <Icon className="size-3.5" aria-hidden /> : null}
        {label}
      </p>
      <div className="mt-1 min-w-0 truncate text-sm font-semibold text-ink-900 sm:mt-2 sm:text-base">
        {children}
      </div>
    </>
  )
  return href ? (
    <a href={href} className={classes}>
      {body}
    </a>
  ) : (
    <div className={classes}>{body}</div>
  )
}

/** A block of longer text: a message, a reply. */
export function DetailText({
  label,
  tone = "default",
  icon: Icon,
  children,
  footer,
}: {
  label: string
  tone?: "default" | "success" | "brand"
  icon?: LucideIcon
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 sm:p-5",
        tone === "default" && "border-border bg-white",
        tone === "success" && "border-emerald-200 bg-emerald-50",
        tone === "brand" && "border-brand-100 bg-brand-50/60",
      )}
    >
      <p
        className={cn(
          "flex items-center gap-2 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] sm:text-xs sm:tracking-[0.14em]",
          tone === "default" && "text-ink-500",
          tone === "success" && "text-emerald-700",
          tone === "brand" && "text-brand-700",
        )}
      >
        {Icon ? <Icon className="size-4" aria-hidden /> : null}
        {label}
      </p>
      <div
        className={cn(
          "mt-2 whitespace-pre-wrap text-sm leading-6 sm:mt-3",
          tone === "success" ? "text-emerald-950" : "text-ink-700",
        )}
      >
        {children}
      </div>
      {footer}
    </div>
  )
}

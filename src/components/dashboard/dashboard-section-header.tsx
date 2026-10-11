import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type DashboardSectionHeaderProps = {
  title: string
  /** Small label above the title. Shown from sm up only. */
  kicker?: string
  /** One action, usually a small outline button or link. */
  action?: ReactNode
  className?: string
}

/**
 * Heading for a block inside a dashboard screen (a table, a list of recent items).
 * Phones: a plain row, title left and action right, no card. sm and up: the glass panel.
 */
export function DashboardSectionHeader({
  title,
  kicker,
  action,
  className,
}: DashboardSectionHeaderProps) {
  return (
    <>
      <div className={cn("mb-2 flex items-center justify-between gap-3 sm:hidden", className)}>
        <h2 className="text-base font-semibold text-ink-900">{title}</h2>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div
        className={cn(
          "surface-panel mb-5 hidden items-center justify-between gap-4 p-5 sm:flex",
          className,
        )}
      >
        <div>
          {kicker ? (
            <p className="text-xs uppercase tracking-[0.18em] text-brand-700">{kicker}</p>
          ) : null}
          <h2 className={cn("text-h3", kicker && "mt-2")}>{title}</h2>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </>
  )
}

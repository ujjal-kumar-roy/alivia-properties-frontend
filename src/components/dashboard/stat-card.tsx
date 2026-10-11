import type { LucideIcon } from "lucide-react"
import { TrendingDown, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

export type StatTone = "brand" | "gold" | "info" | "success" | "warning" | "danger"

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  trend?: number
  trendLabel?: string
  tone?: StatTone
  className?: string
  hint?: string
}

const TONE_STYLES: Record<
  StatTone,
  { iconBg: string; iconText: string; ring: string; glow: string }
> = {
  brand: {
    iconBg: "bg-linear-to-br from-brand-500 to-brand-700",
    iconText: "text-white",
    ring: "ring-brand-100",
    glow: "from-brand-100/80",
  },
  gold: {
    iconBg: "bg-linear-to-br from-gold-300 to-gold-500",
    iconText: "text-ink-900",
    ring: "ring-gold-100",
    glow: "from-gold-100/70",
  },
  info: {
    iconBg: "bg-linear-to-br from-sky-400 to-sky-600",
    iconText: "text-white",
    ring: "ring-sky-100",
    glow: "from-sky-100/70",
  },
  success: {
    iconBg: "bg-linear-to-br from-emerald-400 to-emerald-600",
    iconText: "text-white",
    ring: "ring-emerald-100",
    glow: "from-emerald-100/70",
  },
  warning: {
    iconBg: "bg-linear-to-br from-amber-300 to-amber-500",
    iconText: "text-ink-900",
    ring: "ring-amber-100",
    glow: "from-amber-100/70",
  },
  danger: {
    iconBg: "bg-linear-to-br from-rose-400 to-rose-600",
    iconText: "text-white",
    ring: "ring-rose-100",
    glow: "from-rose-100/70",
  },
}

export function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  trendLabel,
  tone = "brand",
  hint,
  className,
}: StatCardProps) {
  const isPositive = trend !== undefined && trend >= 0
  const styles = TONE_STYLES[tone]

  const iconTile = (small: boolean) => (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center shadow-elevated",
        small ? "size-8 rounded-xl ring-2" : "size-11 rounded-2xl ring-4",
        styles.iconBg,
        styles.iconText,
        styles.ring,
      )}
    >
      <Icon className={small ? "size-4" : "size-5"} />
    </div>
  )

  return (
    <div
      className={cn(
        "group surface-card relative flex flex-col gap-1.5 overflow-hidden p-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated sm:gap-4 sm:p-5",
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-linear-to-br to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100",
          styles.glow,
        )}
        aria-hidden
      />
      {/* Phones: the label gets the full card width and the icon sits beside the value. sm and up: label and icon share the top row. */}
      <div className="relative flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink-500 sm:tracking-[0.18em]">
          {label}
        </span>
        <div className="hidden sm:block">{iconTile(false)}</div>
      </div>
      <div className="relative flex items-center justify-between gap-2 sm:items-end">
        <span className="text-2xl font-bold leading-none tracking-tight text-ink-900 tabular-nums sm:text-3xl">
          {value}
        </span>
        <div className="sm:hidden">{iconTile(true)}</div>
        {trend !== undefined && (
          <div
            className={cn(
              "hidden items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold sm:flex",
              isPositive
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-700",
            )}
          >
            {isPositive ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      {(hint || trendLabel) && (
        <p className="relative hidden text-xs text-ink-500 sm:block">{hint ?? trendLabel}</p>
      )}
    </div>
  )
}

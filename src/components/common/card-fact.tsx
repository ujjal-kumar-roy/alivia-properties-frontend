import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type CardFactProps = {
  icon: LucideIcon
  children: React.ReactNode
  className?: string
  /** Overrides the default brand-green icon colour (e.g. a gold star for ratings). */
  iconClassName?: string
}

/**
 * One compact fact on a listing card ("2-3 Bed", "6 Floors"). Icon plus text on
 * a single line, sized for dense mobile rows; keep the text short.
 */
export function CardFact({ icon: Icon, children, className, iconClassName }: CardFactProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-ink-600",
        className,
      )}
    >
      <Icon aria-hidden="true" className={cn("size-3.5 shrink-0 text-brand-600", iconClassName)} />
      {children}
    </span>
  )
}

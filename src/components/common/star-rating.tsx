import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface StarRatingProps {
  value: number
  count?: number
  showValue?: boolean
  size?: "xs" | "sm" | "md"
  className?: string
}

export function StarRating({ value, count, showValue, size = "sm", className }: StarRatingProps) {
  const starSize = size === "xs" ? "h-3 w-3" : size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"
  const textSize = size === "xs" ? "text-[0.6875rem]" : size === "sm" ? "text-xs" : "text-sm"

  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(starSize, i <= Math.round(value) ? "fill-gold-400 text-gold-400" : "fill-none text-ink-300")}
        />
      ))}
      {showValue && (
        <span className={cn("ml-1 font-medium text-ink-700", textSize)}>
          {value.toFixed(1)}
          {count != null && <span className="ml-0.5 font-normal text-ink-400">({count})</span>}
        </span>
      )}
    </span>
  )
}

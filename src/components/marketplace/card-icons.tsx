import { forwardRef } from "react"
import { Star, type LucideProps } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * A filled gold star that drops into <CardFact icon={GoldStar}> (CardFact tints
 * its icon emerald, so a rating needs its own colour).
 */
export const GoldStar = forwardRef<SVGSVGElement, LucideProps>(function GoldStar(
  { className, ...props },
  ref,
) {
  return <Star ref={ref} {...props} className={cn(className, "fill-gold-400 text-gold-400")} />
})

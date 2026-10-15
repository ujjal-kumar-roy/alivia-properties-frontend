"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { ClipboardList } from "lucide-react"

import { ROUTES } from "@/config/routes.config"
import { useQuoteList } from "@/hooks/use-quote-list"
import { cn } from "@/lib/utils"

/**
 * The primary slot of a MobileActionBar. Once the visitor has products in
 * their quote list the next step is reviewing it; until then (and on the
 * server render) the page's own call to action, `children`, shows instead.
 *
 *   <MobileActionBar label="Request a quote">
 *     <QuoteListAction>
 *       <Link href={quoteHref} className="btn-tactile flex-1">Ask for a price</Link>
 *     </QuoteListAction>
 *     ...quiet icon buttons
 *   </MobileActionBar>
 */
export function QuoteListAction({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const { count, ready } = useQuoteList()
  if (!ready || count === 0) return <>{children}</>

  return (
    <Link href={ROUTES.MARKETPLACE_CART} className={cn("btn-tactile flex-1", className)}>
      <ClipboardList aria-hidden="true" className="size-4" />
      Review quote list ({count})
    </Link>
  )
}

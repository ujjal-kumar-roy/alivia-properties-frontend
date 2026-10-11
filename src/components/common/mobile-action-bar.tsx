"use client"

import { useEffect, type ReactNode } from "react"
import { cn } from "@/lib/utils"

type MobileActionBarProps = {
  /** Landmark name for assistive tech, e.g. "Contact this agent". */
  label: string
  children: ReactNode
  className?: string
}

/**
 * A bar pinned to the bottom of phone screens so the next step (call, WhatsApp,
 * book a visit, get a quote) is always one thumb-tap away. Hidden from md up.
 * While mounted it sets html[data-action-bar], which pads the page and lifts
 * the chat, compare and cookie layers by --bottom-bar-h so nothing overlaps.
 *
 * Put one primary action in it (`btn-tactile btn-tactile--block`) and at most
 * two quiet ones (icon buttons, 44px square).
 */
export function MobileActionBar({ label, children, className }: MobileActionBarProps) {
  useEffect(() => {
    const root = document.documentElement
    root.dataset.actionBar = "true"
    return () => {
      delete root.dataset.actionBar
    }
  }, [])

  return (
    <div role="region" aria-label={label} className={cn("action-bar", className)}>
      {children}
    </div>
  )
}

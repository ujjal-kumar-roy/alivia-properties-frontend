"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { GuideAvatar } from "@/components/common/guide-avatar"
import { celebrate, prefersReducedMotion } from "@/lib/celebrate"
import { cn } from "@/lib/utils"

type FormSuccessProps = {
  title: string
  children?: ReactNode
  /** Buttons or links under the message. */
  actions?: ReactNode
  /** Confetti is for outcomes that matter (a message or request sent). Pass false for routine confirmations. */
  confetti?: boolean
  className?: string
}

/**
 * The "it worked" moment for a lead form: the Alivia guide cheers beside a
 * short line, the card scrolls into view (the long form it replaces was taller),
 * and one confetti burst fires. It mounts once per success, so the cheer and the
 * burst each play once. Reduced motion keeps the card and drops the movement.
 */
export function FormSuccess({ title, children, actions, confetti = true, className }: FormSuccessProps) {
  const ref = useRef<HTMLDivElement>(null)
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    fired.current = true
    ref.current?.scrollIntoView({
      block: "center",
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    })
    if (confetti) celebrate()
  }, [confetti])

  return (
    <div
      ref={ref}
      role="status"
      className={cn("anim-slide-up rounded-2xl border border-brand-100 bg-brand-50/70 p-3.5 sm:p-5", className)}
    >
      <div className="flex items-start gap-3">
        <GuideAvatar mood="cheer" size={44} className="mt-0.5" />
        <div className="speech-bubble min-w-0 flex-1">
          <p className="text-base font-extrabold text-ink-900">{title}</p>
          {children && <div className="mt-0.5 text-sm font-medium text-ink-600">{children}</div>}
        </div>
      </div>
      {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

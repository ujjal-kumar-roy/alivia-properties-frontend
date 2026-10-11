"use client"

import { Building2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

type GuideMood = "idle" | "cheer" | "think"

type GuideAvatarProps = {
  /** idle bobs while on screen; cheer and think are one-shot reactions (re-key to replay). */
  mood?: GuideMood
  /** Rendered size in px. */
  size?: number
  className?: string
}

/**
 * The Alivia mark (the same emerald tile as the site header logo, so it stays
 * crisp at any size) as a friendly guide that sits beside a speech bubble and
 * reacts to what the visitor does. Decorative (aria-hidden): the words in the
 * bubble carry the meaning. The idle loop only runs while it is on screen.
 */
export function GuideAvatar({ mood = "idle", size = 56, className }: GuideAvatarProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const [onScreen, setOnScreen] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), {
      threshold: 0.2,
    })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <span
      ref={ref}
      aria-hidden="true"
      className={cn("relative inline-block shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <span
        className={cn(
          "guide flex size-full items-center justify-center rounded-[28%] bg-linear-to-br from-brand-500 to-brand-800 text-white shadow-md ring-1 ring-white/25",
          mood === "cheer" && "guide-cheer",
          mood === "think" && "guide-think",
          mood === "idle" && onScreen && "guide-idle",
        )}
      >
        <Building2 className="size-[52%]" strokeWidth={2} />
      </span>
    </span>
  )
}

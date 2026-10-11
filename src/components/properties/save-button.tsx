"use client"

import { useState } from "react"
import { Heart } from "lucide-react"
import { useSaveProperty } from "@/hooks/use-save-property"
import { haptic } from "@/lib/celebrate"
import { cn } from "@/lib/utils"

interface SaveButtonProps {
  propertyId: string
  className?: string
  /**
   * "glass" is the 36px translucent icon button used on photos (cards and the
   * phone gallery). "plain" keeps the original flat circle.
   */
  variant?: "plain" | "glass"
}

export function SaveButton({ propertyId, className, variant = "plain" }: SaveButtonProps) {
  const { saved, toggle } = useSaveProperty(propertyId)
  // Bumped only when the visitor saves, so the heart pops on their tap and
  // never when the saved state is first read back from localStorage.
  const [popKey, setPopKey] = useState(0)

  function onClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    if (!saved) setPopKey((k) => k + 1)
    haptic("tap")
    void toggle()
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      aria-label="Save property"
      className={cn(
        variant === "glass"
          ? "btn-glass size-9 min-h-9 min-w-9 shrink-0 !p-0 text-ink-700"
          : cn(
              "flex h-7 w-7 cursor-pointer items-center justify-center rounded-full transition-colors",
              saved
                ? "bg-red-50 text-red-500 hover:bg-red-100"
                : "bg-muted text-muted-foreground hover:text-red-400",
            ),
        className,
      )}
    >
      <Heart
        key={popKey}
        aria-hidden="true"
        className={cn(
          variant === "glass" ? "size-4" : "h-3.5 w-3.5",
          saved && "fill-current",
          saved && variant === "glass" && "text-red-500",
          saved && popKey > 0 && "anim-heart-pop",
        )}
      />
    </button>
  )
}

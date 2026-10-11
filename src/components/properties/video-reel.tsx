"use client"

import Image from "next/image"
import { Play, Volume2, VolumeX } from "lucide-react"
import { useState } from "react"

export type Reel = {
  id: string
  videoUrl: string
  poster: string
  caption: string
  duration: string
}

export function VideoReel({
  reels,
  embedded = false,
}: {
  reels: Reel[]
  /** Inside an accordion: no card or heading of its own (the section supplies them). */
  embedded?: boolean
}) {
  const [muted, setMuted] = useState(true)

  if (!reels.length) return null

  return (
    <div className={embedded ? undefined : "surface-card p-5"}>
      <div className={embedded ? "mb-2 flex items-center justify-end gap-3" : "mb-4 flex items-center justify-between gap-3"}>
        {!embedded && <h3 className="text-h3">Video reels</h3>}
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 text-ink-700 transition-colors hover:bg-ink-50"
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {reels.map((reel) => (
          <div
            key={reel.id}
            className="relative aspect-[9/16] w-44 shrink-0 overflow-hidden rounded-[1.25rem] bg-ink-100"
          >
            {reel.poster ? (
              <Image
                src={reel.poster}
                alt={reel.caption}
                fill
                sizes="180px"
                className="object-cover"
              />
            ) : null}
            <div className="absolute inset-0 bg-linear-to-t from-ink-950/80 via-ink-950/20 to-transparent" />
            <button
              type="button"
              className="absolute inset-0 flex items-center justify-center text-white/95"
              aria-label={`Play ${reel.caption}`}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/95 text-brand-700">
                <Play className="h-5 w-5" fill="currentColor" />
              </span>
            </button>
            <div className="absolute bottom-2 left-2 right-2 text-white">
              <p className="line-clamp-2 text-xs font-semibold">{reel.caption}</p>
              <p className="text-[0.65rem] text-white/70">{reel.duration}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

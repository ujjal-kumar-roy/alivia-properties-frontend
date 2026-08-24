"use client"

import { useState } from "react"
import Image from "next/image"
import { Package, Wrench } from "lucide-react"
import { cn } from "@/lib/utils"

export function ProductGallery({
  name,
  image,
  gallery,
  videoUrl,
  serviceMode,
}: {
  name: string
  image: string
  gallery: string[]
  videoUrl?: string | null
  serviceMode: boolean
}) {
  const items = [image, ...gallery].filter(Boolean)
  const [activeIndex, setActiveIndex] = useState(0)
  const [showVideo, setShowVideo] = useState(false)

  if (items.length === 0) {
    return (
      <div className="flex aspect-4/3 w-full flex-col items-center justify-center gap-4 bg-linear-to-br from-brand-50 via-white to-gold-50 px-6 text-center">
        <span className="flex size-20 items-center justify-center rounded-2xl bg-white text-brand-500 shadow-(--shadow-card)">
          {serviceMode ? <Wrench aria-hidden="true" className="size-9" /> : <Package aria-hidden="true" className="size-9" />}
        </span>
        <span className="max-w-xs text-sm font-semibold text-brand-800">{name}</span>
        <span className="text-xs text-ink-500">{serviceMode ? "Service image coming soon" : "Product image coming soon"}</span>
      </div>
    )
  }

  return (
    <div>
      <div className="relative aspect-4/3 w-full overflow-hidden bg-ink-50">
        {showVideo && videoUrl ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video src={videoUrl} controls className="h-full w-full object-cover" />
        ) : (
          <Image src={items[activeIndex]} alt={`${name} photo ${activeIndex + 1}`} fill sizes="(min-width: 1024px) 50vw, 100vw" priority className="object-cover" />
        )}
      </div>
      {(items.length > 1 || videoUrl) ? (
        <div className="flex gap-2 overflow-x-auto p-3" role="tablist" aria-label="Product media">
          {items.map((url, index) => (
            <button
              key={url + index}
              type="button"
              role="tab"
              aria-selected={!showVideo && activeIndex === index}
              onClick={() => { setShowVideo(false); setActiveIndex(index) }}
              className={cn(
                "relative size-14 shrink-0 overflow-hidden rounded-lg border-2",
                !showVideo && activeIndex === index ? "border-brand-600" : "border-transparent",
              )}
            >
              <Image src={url} alt="" fill sizes="56px" className="object-cover" />
            </button>
          ))}
          {videoUrl ? (
            <button
              type="button"
              role="tab"
              aria-selected={showVideo}
              onClick={() => setShowVideo(true)}
              className={cn(
                "flex size-14 shrink-0 items-center justify-center rounded-lg border-2 bg-ink-900 text-[10px] font-semibold text-white",
                showVideo ? "border-brand-600" : "border-transparent",
              )}
            >
              Video
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

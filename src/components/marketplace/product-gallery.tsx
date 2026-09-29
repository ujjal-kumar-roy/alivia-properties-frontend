"use client"

import { useState } from "react"
import Image from "next/image"
import { ExternalLink, Package, Wrench } from "lucide-react"
import { resolveVideoLink, type VideoLink } from "@/lib/video-link"
import { cn } from "@/lib/utils"

/** "file" = the uploaded video, "link" = the pasted external video link. */
type ActiveVideo = "file" | "link" | null

export function ProductGallery({
  name,
  image,
  gallery,
  videoUrl,
  externalVideoUrl,
  serviceMode,
}: {
  name: string
  image: string
  gallery: string[]
  videoUrl?: string | null
  externalVideoUrl?: string | null
  serviceMode: boolean
}) {
  const items = [image, ...gallery].filter(Boolean)
  const externalVideo = resolveVideoLink(externalVideoUrl)
  const [activeIndex, setActiveIndex] = useState(0)
  const [activeVideo, setActiveVideo] = useState<ActiveVideo>(null)

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
        {activeVideo === "file" && videoUrl ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video src={videoUrl} controls className="h-full w-full object-cover" />
        ) : activeVideo === "link" && externalVideo ? (
          <ExternalVideoPlayer name={name} video={externalVideo} />
        ) : (
          <Image src={items[activeIndex]} alt={`${name} photo ${activeIndex + 1}`} fill sizes="(min-width: 1024px) 50vw, 100vw" priority className="object-cover" />
        )}
      </div>
      {(items.length > 1 || videoUrl || externalVideo) ? (
        <div className="flex gap-2 overflow-x-auto p-3" role="tablist" aria-label="Product media">
          {items.map((url, index) => (
            <button
              key={url + index}
              type="button"
              role="tab"
              aria-selected={activeVideo === null && activeIndex === index}
              onClick={() => { setActiveVideo(null); setActiveIndex(index) }}
              className={cn(
                "relative size-14 shrink-0 overflow-hidden rounded-lg border-2",
                activeVideo === null && activeIndex === index ? "border-brand-600" : "border-transparent",
              )}
            >
              <Image src={url} alt="" fill sizes="56px" className="object-cover" />
            </button>
          ))}
          {videoUrl ? (
            <VideoTab label="Video" selected={activeVideo === "file"} onClick={() => setActiveVideo("file")} />
          ) : null}
          {externalVideo ? (
            <VideoTab
              label={externalVideo.kind === "embed" ? externalVideo.provider : "Video link"}
              selected={activeVideo === "link"}
              onClick={() => setActiveVideo("link")}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function ExternalVideoPlayer({ name, video }: { name: string; video: VideoLink }) {
  if (video.kind === "embed") {
    return (
      <iframe
        src={video.src}
        title={`${name} video`}
        loading="lazy"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        className="h-full w-full border-0"
      />
    )
  }

  if (video.kind === "file") {
    return <video src={video.src} controls className="h-full w-full object-cover" />
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-ink-900 px-6 text-center text-white">
      <p className="text-sm font-semibold">Watch the video for {name}</p>
      <a
        href={video.href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full bg-gold-400 px-4 py-2 text-sm font-semibold text-ink-900 hover:bg-gold-300"
      >
        Open video <ExternalLink aria-hidden="true" className="size-4" />
      </a>
      <p className="text-xs text-white/60">Opens in a new tab</p>
    </div>
  )
}

function VideoTab({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={cn(
        "flex size-14 shrink-0 items-center justify-center rounded-lg border-2 bg-ink-900 px-1 text-center text-[10px] font-semibold leading-tight text-white",
        selected ? "border-brand-600" : "border-transparent",
      )}
    >
      {label}
    </button>
  )
}

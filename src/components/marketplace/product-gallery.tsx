import { Package, Wrench } from "lucide-react"

import { SwipeGallery, type GallerySlide } from "@/components/marketplace/SwipeGallery"
import { resolveVideoLink } from "@/lib/video-link"

/**
 * Product photo and video stage: a swipeable strip on phones (dots and a
 * counter, tap for the full-screen viewer), arrows and thumbnails from `sm`.
 * Uploaded video and pasted video links become slides that load their player
 * only when tapped.
 */
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
  const photos = [image, ...gallery].filter(Boolean)
  const slides: GallerySlide[] = photos.map((src, index) => ({
    kind: "image",
    src,
    alt: `${name} photo ${index + 1}`,
  }))

  if (videoUrl) {
    slides.push({
      kind: "video",
      poster: photos[0] ?? null,
      label: `${name} video`,
      source: { type: "file", src: videoUrl },
    })
  }

  const external = resolveVideoLink(externalVideoUrl)
  if (external) {
    slides.push({
      kind: "video",
      poster: photos[0] ?? null,
      label: external.kind === "embed" ? `${external.provider} video` : `${name} video link`,
      source:
        external.kind === "embed"
          ? { type: "embed", src: external.src, title: `${name} video` }
          : external.kind === "file"
            ? { type: "file", src: external.src }
            : { type: "link", href: external.href },
    })
  }

  const Icon = serviceMode ? Wrench : Package

  return (
    <SwipeGallery
      slides={slides}
      name={name}
      priority
      empty={
        <div className="flex h-36 w-full flex-col items-center justify-center gap-2 bg-linear-to-br from-brand-50 via-white to-gold-50 px-6 text-center sm:aspect-4/3 sm:h-auto sm:gap-4">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-white text-brand-500 shadow-(--shadow-card) sm:size-20">
            <Icon aria-hidden="true" className="size-7 sm:size-9" />
          </span>
          <span className="text-xs text-ink-500">
            {serviceMode ? "Service image coming soon" : "Product image coming soon"}
          </span>
        </div>
      }
    />
  )
}

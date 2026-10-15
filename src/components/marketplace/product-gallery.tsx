import { Package, Wrench } from "lucide-react"

import { SwipeGallery, type GallerySlide } from "@/components/marketplace/SwipeGallery"
import { resolveVideoLink } from "@/lib/video-link"

/**
 * Product photo and video stage. Phones: an edge-to-edge square strip (the
 * negative margin cancels the page gutter), swipe with a counter and dots, tap
 * for the full-screen viewer. From `md`: a 1:1 stage on white with a vertical
 * thumbnail column, a crossfade between photos and hover-zoom. Uploaded video
 * and pasted video links become slides that load their player only when tapped.
 *
 * The page must not wrap this in a clipped or bordered box: on phones the
 * stage bleeds into the gutter, and from `md` the stage draws its own frame.
 */
export function ProductGallery({
  name,
  image,
  gallery,
  videoUrl,
  externalVideoUrl,
  serviceMode,
  slug,
}: {
  name: string
  image: string
  gallery: string[]
  videoUrl?: string | null
  externalVideoUrl?: string | null
  serviceMode: boolean
  /** Product slug: names the hero photo for the card-to-page morph. */
  slug?: string
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
      variant="product"
      slides={slides}
      name={name}
      priority
      aspectClassName="aspect-square"
      // Matches .container-page's gutters (px-4 sm:px-6) below md.
      className="-mx-4 sm:-mx-6 md:mx-0"
      transitionName={slug ? `product-${slug}` : undefined}
      empty={
        <div className="flex h-36 w-full flex-col items-center justify-center gap-2 bg-linear-to-br from-brand-50 via-white to-gold-50 px-6 text-center md:aspect-square md:h-auto md:gap-4 md:rounded-2xl md:border md:border-border/70">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-white text-brand-500 shadow-(--shadow-card) md:size-20">
            <Icon aria-hidden="true" className="size-7 md:size-9" />
          </span>
          <span className="text-xs text-ink-500">
            {serviceMode ? "Service image coming soon" : "Product image coming soon"}
          </span>
        </div>
      }
    />
  )
}

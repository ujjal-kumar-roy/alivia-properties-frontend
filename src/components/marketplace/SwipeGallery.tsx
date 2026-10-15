"use client"

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react"
import { ViewTransition } from "react"
import { motion } from "motion/react"
import { ChevronLeft, ChevronRight, ExternalLink, ImageIcon, Play } from "lucide-react"

import { MediaImage } from "@/components/marketplace/MediaImage"
import { MediaLightbox } from "@/components/marketplace/MediaLightbox"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"
import { CARD_BLUR_DATA_URL } from "@/lib/image-placeholder"
import { springs } from "@/lib/motion"
import { cn } from "@/lib/utils"

/** How a video slide plays once the visitor taps it. */
export type VideoSource =
  | { type: "file"; src: string }
  | { type: "embed"; src: string; title: string }
  | { type: "link"; href: string }

export type GallerySlide =
  | { kind: "image"; src: string; alt: string }
  | { kind: "video"; poster?: string | null; label: string; source: VideoSource }

type SwipeGalleryProps = {
  slides: GallerySlide[]
  /** Used for the lightbox label, e.g. the product or supplier name. */
  name: string
  /** Rendered instead of the stage when there are no slides. */
  empty?: ReactNode
  /** Stage proportions. Phones default to 4:3. */
  aspectClassName?: string
  className?: string
  /** Chips pinned to the top-left of the stage (counts, badges). */
  overlay?: ReactNode
  /** Thumbnail strip from `sm` up (phones use the dots and the swipe). */
  thumbs?: boolean
  thumbTone?: "light" | "dark"
  /** Skip the Next image optimizer (backend/uploaded photos). */
  unoptimized?: boolean
  /** Eager-load the first photo (use when the gallery is above the fold). */
  priority?: boolean
  /** Shared-element name for the first photo (morphs from the list card image). */
  transitionName?: string
}

/**
 * A swipeable photo and video stage. The slides are a CSS scroll-snap strip
 * (native momentum and snapping, no gesture code), the active slide is tracked
 * with an IntersectionObserver, and a tap opens the lightbox. Phones get a
 * counter chip and dots; `sm` and up add arrows and a thumbnail strip. A video
 * slide shows its poster with a play button and only loads the player on tap.
 */
export function SwipeGallery({
  slides,
  name,
  empty,
  aspectClassName = "aspect-4/3",
  className,
  overlay,
  thumbs = true,
  thumbTone = "light",
  unoptimized = false,
  priority = false,
  transitionName,
}: SwipeGalleryProps) {
  const ringId = useId()
  const reduced = usePrefersReducedMotion()
  const scroller = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const [playing, setPlaying] = useState<number | null>(null)
  const [lightbox, setLightbox] = useState<number | null>(null)

  const images = slides.filter((slide): slide is Extract<GallerySlide, { kind: "image" }> => slide.kind === "image")
  const imageUrls = images.map((slide) => slide.src)
  const count = slides.length

  // Track which slide is centred, without a scroll listener.
  useEffect(() => {
    const root = scroller.current
    if (!root || count < 2) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const next = Number((entry.target as HTMLElement).dataset.index)
            setActive(next)
            setPlaying(null)
          }
        }
      },
      { root, threshold: [0.6] },
    )
    root.querySelectorAll("[data-index]").forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [count])

  const goTo = useCallback(
    (index: number, instant = false) => {
      const root = scroller.current
      if (!root) return
      const target = Math.max(0, Math.min(count - 1, index))
      root.scrollTo({
        left: target * root.clientWidth,
        behavior: reduced || instant ? "auto" : "smooth",
      })
    },
    [count, reduced],
  )

  if (count === 0) return <div className={className}>{empty}</div>

  const imageIndexOf = (slideIndex: number) =>
    slides.slice(0, slideIndex).filter((slide) => slide.kind === "image").length

  const tile = (
    <span className="flex size-full items-center justify-center bg-linear-to-br from-brand-50 to-brand-100 text-brand-300">
      <ImageIcon aria-hidden="true" className="size-10" />
    </span>
  )

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowRight") {
      e.preventDefault()
      goTo(active + 1)
    } else if (e.key === "ArrowLeft") {
      e.preventDefault()
      goTo(active - 1)
    }
  }

  return (
    <div className={className}>
      <div className="relative">
        <div
          ref={scroller}
          role="region"
          aria-roledescription="carousel"
          aria-label={`${name} photos`}
          tabIndex={0}
          onKeyDown={onKeyDown}
          className={cn(
            "flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain scrollbar-none outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-400",
            aspectClassName,
          )}
        >
          {slides.map((slide, index) => {
            const photo =
              slide.kind === "image" ? (
                <MediaImage
                  src={slide.src}
                  alt={slide.alt}
                  fill
                  unoptimized={unoptimized}
                  priority={priority && index === 0}
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  placeholder="blur"
                  blurDataURL={CARD_BLUR_DATA_URL}
                  className="object-cover"
                  fallback={tile}
                />
              ) : null
            return (
            <div
              key={`${slide.kind}-${index}`}
              data-index={index}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${count}`}
              className="relative h-full w-full shrink-0 snap-center bg-ink-50"
            >
              {slide.kind === "image" ? (
                <button
                  type="button"
                  aria-label={`Open photo ${imageIndexOf(index) + 1} full screen`}
                  onClick={() => setLightbox(imageIndexOf(index))}
                  className="absolute inset-0 block cursor-zoom-in outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-400"
                >
                  {index === 0 && transitionName ? (
                    <ViewTransition name={transitionName}>{photo}</ViewTransition>
                  ) : (
                    photo
                  )}
                </button>
              ) : playing === index ? (
                <VideoPlayer source={slide.source} title={slide.label} />
              ) : (
                <>
                  <MediaImage
                    src={slide.poster}
                    alt=""
                    fill
                    unoptimized={unoptimized}
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-cover"
                    fallback={
                      <span className="absolute inset-0 bg-linear-to-br from-brand-100 via-brand-200 to-gold-100" />
                    }
                  />
                  <button
                    type="button"
                    aria-label={`Play ${slide.label}`}
                    onClick={() => setPlaying(index)}
                    className="absolute left-1/2 top-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/92 text-brand-700 shadow-lg transition-transform duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:hover:scale-105 motion-reduce:transition-none"
                  >
                    <Play aria-hidden="true" className="size-6 translate-x-0.5 fill-current" />
                  </button>
                </>
              )}
            </div>
            )
          })}
        </div>

        {overlay ? (
          <div className="pointer-events-none absolute left-2 top-2 flex flex-wrap gap-1.5 sm:left-3 sm:top-3">
            {overlay}
          </div>
        ) : null}

        {count > 1 ? (
          <>
            <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold tabular-nums text-white backdrop-blur-sm sm:right-3 sm:top-3">
              <motion.span
                key={active}
                className="inline-block"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={springs.snappy}
              >
                {active + 1}
              </motion.span>{" "}
              / {count}
            </span>
            <div
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-1.5",
                // Leave the player's own controls alone while a video plays.
                playing !== null && "hidden",
              )}
            >
              {slides.map((_, index) => (
                <span
                  key={index}
                  className={cn(
                    "h-1.5 rounded-full bg-white/70 shadow-sm transition-[width,background-color] duration-300 ease-out motion-reduce:transition-none",
                    index === active ? "w-5 bg-white" : "w-1.5",
                  )}
                />
              ))}
            </div>
            <button
              type="button"
              aria-label="Previous photo"
              onClick={() => goTo(active - 1)}
              disabled={active === 0}
              className="absolute left-3 top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-[opacity,scale] hover:bg-black/65 active:scale-90 disabled:opacity-0 motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:flex"
            >
              <ChevronLeft aria-hidden="true" className="size-5" />
            </button>
            <button
              type="button"
              aria-label="Next photo"
              onClick={() => goTo(active + 1)}
              disabled={active === count - 1}
              className="absolute right-3 top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-[opacity,scale] hover:bg-black/65 active:scale-90 disabled:opacity-0 motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:flex"
            >
              <ChevronRight aria-hidden="true" className="size-5" />
            </button>
          </>
        ) : null}
      </div>

      {thumbs && count > 1 ? (
        <div
          className={cn(
            "hidden gap-2 overflow-x-auto p-3 scrollbar-none sm:flex",
            thumbTone === "dark" && "bg-ink-950/60",
          )}
          aria-label={`${name} gallery thumbnails`}
          role="group"
        >
          {slides.map((slide, index) => {
            const thumbSrc = slide.kind === "image" ? slide.src : slide.poster
            return (
              <button
                key={`${slide.kind}-${index}`}
                type="button"
                aria-label={slide.kind === "video" ? `Show ${slide.label}` : `Show photo ${imageIndexOf(index) + 1}`}
                aria-current={index === active ? "true" : undefined}
                onClick={() => goTo(index)}
                className={cn(
                  "relative size-14 shrink-0 overflow-hidden rounded-lg border-2 border-transparent transition-[opacity,scale] duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 motion-reduce:transition-none motion-reduce:active:scale-100",
                  thumbTone === "dark" ? "bg-ink-900" : "bg-ink-50",
                  index !== active && "opacity-70 hover:opacity-100",
                )}
              >
                <MediaImage
                  src={thumbSrc}
                  alt=""
                  fill
                  unoptimized={unoptimized}
                  sizes="56px"
                  className="object-cover"
                  fallback={<span className="absolute inset-0 bg-brand-100" />}
                />
                {slide.kind === "video" ? (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/35">
                    <Play aria-hidden="true" className="size-4 fill-white text-white" />
                  </span>
                ) : null}
                {index === active ? (
                  <motion.span
                    layoutId={`${ringId}-thumb-ring`}
                    transition={springs.move}
                    aria-hidden="true"
                    className={cn(
                      "pointer-events-none absolute inset-0 rounded-[0.4rem] border-2",
                      thumbTone === "dark" ? "border-gold-300" : "border-brand-600",
                    )}
                  />
                ) : null}
              </button>
            )
          })}
        </div>
      ) : null}

      {imageUrls.length > 0 ? (
        <MediaLightbox
          images={imageUrls}
          index={lightbox ?? 0}
          open={lightbox !== null}
          onOpenChange={(open) => {
            if (open) return
            // Land the strip on the last photo the visitor was looking at.
            if (lightbox !== null) {
              const slideIndex = slides.findIndex(
                (slide) => slide.kind === "image" && slide.src === imageUrls[lightbox],
              )
              if (slideIndex >= 0) goTo(slideIndex, true)
            }
            setLightbox(null)
          }}
          onIndexChange={setLightbox}
          label={name}
        />
      ) : null}
    </div>
  )
}

function VideoPlayer({ source, title }: { source: VideoSource; title: string }) {
  if (source.type === "embed") {
    return (
      <iframe
        src={source.src}
        title={source.title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        className="absolute inset-0 size-full border-0 bg-black"
      />
    )
  }
  if (source.type === "file") {
    return (
      <video
        src={source.src}
        controls
        autoPlay
        playsInline
        className="absolute inset-0 size-full bg-black object-contain"
      />
    )
  }
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink-900 px-6 text-center text-white">
      <p className="text-sm font-semibold">Watch {title}</p>
      <a
        href={source.href}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-tactile btn-tactile--gold btn-tactile--sm"
      >
        Open video <ExternalLink aria-hidden="true" className="size-4" />
      </a>
      <p className="text-xs text-white/70">Opens in a new tab</p>
    </div>
  )
}

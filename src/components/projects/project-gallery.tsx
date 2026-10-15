"use client"

import Image from "next/image"
import { useRef, useState, ViewTransition, type ReactNode } from "react"
import { ChevronLeft, ChevronRight, Images, Maximize2 } from "lucide-react"
import { ProjectLightbox } from "@/components/projects/project-image-lightbox-button"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"
import { CARD_BLUR_DATA_URL } from "@/lib/image-placeholder"
import { cn } from "@/lib/utils"
import { nextProjectImageIndex } from "./project-gallery.utils"

type ProjectGalleryProps = {
  images: string[]
  label: string
  className?: string
  /** Shared-element name for the first photo (matches the card image on the list). */
  transitionName?: string
  /** Controls the page floats over the photo (e.g. a back button). */
  children?: ReactNode
}

const GALLERY_SIZES = "(min-width: 1280px) 1216px, (min-width: 640px) calc(100vw - 48px), 100vw"

/**
 * Apartment photo gallery. Photos sit in a native scroll-snap strip: on phones
 * it runs edge to edge and a swipe has real momentum, one flick per photo. The
 * counter and the full-screen button are clear glass over the photo (a soft
 * scrim keeps them legible on bright shots). Tapping a photo opens the
 * lightbox. From `sm` the strip becomes a rounded card with arrows and a
 * thumbnail row for mouse users.
 */
export function ProjectGallery({ images, label, className, transitionName, children }: ProjectGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [viewerOpen, setViewerOpen] = useState(false)
  const stripRef = useRef<HTMLDivElement>(null)
  const reducedMotion = usePrefersReducedMotion()
  const count = images.length

  if (count === 0) return null

  function scrollToSlide(index: number, smooth: boolean) {
    const strip = stripRef.current
    if (!strip) return
    strip.scrollTo({
      left: index * strip.clientWidth,
      behavior: smooth && !reducedMotion ? "smooth" : "auto",
    })
  }

  function handleScroll() {
    const strip = stripRef.current
    if (!strip || strip.clientWidth === 0) return
    setActiveIndex(
      Math.min(count - 1, Math.max(0, Math.round(strip.scrollLeft / strip.clientWidth))),
    )
  }

  function move(delta: number) {
    const next = nextProjectImageIndex(activeIndex, delta, count)
    scrollToSlide(next, Math.abs(next - activeIndex) === 1)
  }

  return (
    <section aria-label={`${label} image gallery`} className={cn("sm:mb-6 lg:mb-10", className)}>
      <div className="relative overflow-hidden bg-ink-100 sm:rounded-[1.5rem] sm:shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
        <div
          ref={stripRef}
          onScroll={handleScroll}
          tabIndex={0}
          role="group"
          aria-roledescription="carousel"
          aria-label={`${label} photos`}
          className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain outline-none [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset [&::-webkit-scrollbar]:hidden"
        >
          {images.map((src, index) => (
            <div
              key={`${src}-${index}`}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${count}`}
              onClick={() => setViewerOpen(true)}
              className="relative aspect-4/3 max-h-[64svh] w-full shrink-0 cursor-zoom-in snap-center snap-always sm:aspect-16/10 sm:max-h-none md:aspect-[16/8.5]"
            >
              {index === 0 && transitionName ? (
                <ViewTransition name={transitionName}>
                <Image
                  src={src}
                  alt={`${label} image ${index + 1}`}
                  fill
                  priority={index === 0}
                  sizes={GALLERY_SIZES}
                  placeholder="blur"
                  blurDataURL={CARD_BLUR_DATA_URL}
                  draggable={false}
                  className="object-cover select-none"
                />
                </ViewTransition>
              ) : (
                <Image
                  src={src}
                  alt={`${label} image ${index + 1}`}
                  fill
                  priority={index === 0}
                  sizes={GALLERY_SIZES}
                  placeholder="blur"
                  blurDataURL={CARD_BLUR_DATA_URL}
                  draggable={false}
                  className="object-cover select-none"
                />
              )}
            </div>
          ))}
        </div>

        {/* Scrims keep the glass controls legible over bright photos. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-linear-to-b from-ink-950/35 to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-ink-950/55 to-transparent"
        />

        <button
          type="button"
          aria-label={`Open ${label} image viewer`}
          onClick={() => setViewerOpen(true)}
          className="glass-clear absolute top-3 right-3 z-10 grid size-11 place-items-center rounded-full text-white transition-[scale] duration-150 outline-none focus-visible:ring-2 focus-visible:ring-gold-300 active:scale-95 motion-reduce:transition-none"
        >
          <Maximize2 aria-hidden="true" className="size-5" />
        </button>

        {count > 1 ? (
          <>
            <p
              aria-hidden="true"
              className="glass-clear pointer-events-none absolute bottom-3 left-3 z-10 inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold tabular-nums text-white"
            >
              <Images className="size-3.5" />
              {activeIndex + 1} / {count}
            </p>
            <span className="sr-only" aria-live="polite">
              Image {activeIndex + 1} of {count}
            </span>
          </>
        ) : null}

        {count > 1 ? (
          <>
            <GalleryArrow label="Previous image" side="left" onClick={() => move(-1)}>
              <ChevronLeft aria-hidden="true" className="size-5" />
            </GalleryArrow>
            <GalleryArrow label="Next image" side="right" onClick={() => move(1)}>
              <ChevronRight aria-hidden="true" className="size-5" />
            </GalleryArrow>
          </>
        ) : null}

        {children}
      </div>

      {count > 1 ? (
        <div className="mt-3 hidden snap-x gap-3 overflow-x-auto pb-2 sm:flex [scrollbar-color:var(--color-brand-300)_transparent] [scrollbar-width:thin]">
          {images.map((image, index) => {
            const isActive = index === activeIndex
            return (
              <button
                key={`${image}-${index}`}
                type="button"
                aria-label={`Show ${label} image ${index + 1}`}
                aria-current={isActive ? "true" : undefined}
                onClick={() => scrollToSlide(index, true)}
                className={cn(
                  "relative aspect-[4/3] w-28 shrink-0 snap-start overflow-hidden rounded-xl border-2 bg-ink-100 transition-[opacity,border-color,box-shadow] duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 sm:w-36",
                  isActive
                    ? "border-brand-600 shadow-[0_10px_30px_rgba(5,150,105,0.18)]"
                    : "border-transparent opacity-75 hover:opacity-100",
                )}
              >
                <Image src={image} alt="" fill sizes="144px" className="object-cover" />
                {isActive ? (
                  <span className="absolute inset-x-2 bottom-1.5 h-0.5 rounded-full bg-gold-400" />
                ) : null}
              </button>
            )
          })}
        </div>
      ) : null}

      <ProjectLightbox
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        images={images}
        startIndex={activeIndex}
        label={label}
        onIndexChange={(index) => scrollToSlide(index, false)}
      />
    </section>
  )
}

function GalleryArrow({
  label,
  side,
  onClick,
  children,
}: {
  label: string
  side: "left" | "right"
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "glass-clear absolute top-1/2 z-10 hidden size-11 -translate-y-1/2 place-items-center rounded-full text-white transition-[scale] duration-150 outline-none focus-visible:ring-2 focus-visible:ring-gold-300 active:scale-95 sm:grid motion-reduce:transition-none",
        side === "left" ? "left-3 md:left-5" : "right-3 md:right-5",
      )}
    >
      {children}
    </button>
  )
}

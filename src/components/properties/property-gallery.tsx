"use client"

import Image from "next/image"
import { useEffect, useRef, useState, ViewTransition } from "react"
import { ChevronLeft, ChevronRight, Images } from "lucide-react"
import { cn } from "@/lib/utils"
import { CARD_BLUR_DATA_URL } from "@/lib/image-placeholder"
import { SaveButton } from "@/components/properties/save-button"
import { CompareButton } from "@/components/properties/compare-button"
import { PropertyImageLightboxButton } from "@/components/properties/property-image-lightbox-button"
import type { Property } from "@/types/property.types"

type PropertyGalleryProps = {
  property: Property
}

export function PropertyGallery({ property }: PropertyGalleryProps) {
  const images = property.images.filter(Boolean)
  if (images.length === 0) return null

  return (
    <>
      <SwipeGallery property={property} images={images} />
      <DesktopGallery property={property} images={images} />
    </>
  )
}

/**
 * The first photo is the shared element the property card morphs into. Only the
 * first photo carries the name, and only one of the two galleries is displayed
 * at a time (the other is display:none), so the name is unique on screen.
 */
function MorphTarget({
  slug,
  active,
  children,
}: {
  slug: string
  active: boolean
  children: React.ReactNode
}) {
  if (!active) return <>{children}</>
  return <ViewTransition name={`property-${slug}`}>{children}</ViewTransition>
}

/**
 * Phones and tablets: a full-bleed strip you swipe. Plain CSS scroll-snap does
 * the movement (it runs on the compositor and respects momentum); the counter
 * follows an IntersectionObserver, so there is no scroll listener and state
 * changes only when the visible photo changes.
 */
function SwipeGallery({ property, images }: { property: Property; images: string[] }) {
  const [index, setIndex] = useState(0)
  const scroller = useRef<HTMLDivElement>(null)
  const multiple = images.length > 1

  useEffect(() => {
    const root = scroller.current
    if (!root || images.length < 2) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.intersectionRatio >= 0.6) {
            setIndex(Number((entry.target as HTMLElement).dataset.index))
          }
        }
      },
      { root, threshold: 0.6 },
    )
    root.querySelectorAll<HTMLElement>("[data-index]").forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [images.length])

  return (
    <div className="relative -mx-4 sm:mx-0 lg:hidden">
      <div
        ref={scroller}
        role="group"
        aria-roledescription="carousel"
        aria-label={`${property.title} photos`}
        tabIndex={0}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain scrollbar-none outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-400 sm:rounded-3xl"
      >
        {images.map((src, i) => (
          <div
            key={`${src}-${i}`}
            data-index={i}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${images.length}`}
            className="relative aspect-4/3 w-full shrink-0 snap-center bg-ink-100 sm:aspect-16/9"
          >
            <MorphTarget slug={property.slug} active={i === 0}>
              <Image
                src={src}
                alt={`${property.title} image ${i + 1}`}
                fill
                sizes="(max-width: 1023px) 100vw, 45vw"
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : "auto"}
                placeholder="blur"
                blurDataURL={CARD_BLUR_DATA_URL}
                className="object-cover"
              />
            </MorphTarget>
          </div>
        ))}
      </div>

      {multiple ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-ink-950/60 px-3 py-1.5 text-xs font-semibold tabular-nums text-white backdrop-blur-md"
        >
          <Images className="size-3.5" />
          {index + 1} / {images.length}
        </div>
      ) : null}

      <PropertyImageLightboxButton images={images} index={index} label={property.title} />

      <div className="absolute bottom-3 right-3 z-10 flex gap-2">
        <SaveButton propertyId={property.id} variant="glass" />
        <CompareButton property={property} variant="glass" />
      </div>
    </div>
  )
}

/** Desktop: the large photo with arrows and a thumbnail strip, as it always was. */
function DesktopGallery({ property, images }: { property: Property; images: string[] }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const activeImage = images[activeIndex]
  const hasMultipleImages = images.length > 1

  if (!activeImage) return null

  function move(delta: number) {
    setActiveIndex((current) => (current + delta + images.length) % images.length)
  }

  return (
    <div className="hidden flex-col gap-3 lg:flex">
      <div className="group relative h-100 overflow-hidden rounded-[1.5rem] bg-ink-100 shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
        <MorphTarget slug={property.slug} active={activeIndex === 0}>
          <Image
            key={activeImage}
            src={activeImage}
            alt={`${property.title} image ${activeIndex + 1}`}
            fill
            loading={activeIndex === 0 ? "eager" : undefined}
            fetchPriority={activeIndex === 0 ? "high" : "auto"}
            sizes="(max-width: 1023px) 100vw, 45vw"
            className="object-cover motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
          />
        </MorphTarget>
        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-ink-950/80 via-ink-950/10 to-transparent" />

        {hasMultipleImages ? (
          <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-ink-950/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
            <Images aria-hidden="true" className="size-3.5" />
            {activeIndex + 1} / {images.length}
          </div>
        ) : null}

        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4">
          <div className="max-w-md text-white">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-white/70">
              {property.type}
            </p>
            <p className="mt-2 text-lg font-semibold">
              {property.area}, {property.district}
            </p>
          </div>
          <div className="flex gap-2">
            <SaveButton
              propertyId={property.id}
              className="h-10 w-10 bg-white/92 text-ink-700 hover:bg-white"
            />
            <CompareButton
              property={property}
              className="h-10 w-10 bg-white/92 text-ink-700 hover:bg-white"
            />
          </div>
        </div>

        <PropertyImageLightboxButton
          images={images}
          index={activeIndex}
          label={property.title}
        />

        {hasMultipleImages ? (
          <>
            <GalleryArrow label="Previous image" side="left" onClick={() => move(-1)}>
              <ChevronLeft aria-hidden="true" className="size-5" />
            </GalleryArrow>
            <GalleryArrow label="Next image" side="right" onClick={() => move(1)}>
              <ChevronRight aria-hidden="true" className="size-5" />
            </GalleryArrow>
          </>
        ) : null}
      </div>

      {hasMultipleImages ? (
        <div className="flex snap-x gap-2.5 overflow-x-auto pb-1 [scrollbar-width:thin] [scrollbar-color:var(--color-brand-300)_transparent]">
          {images.map((image, index) => {
            const isActive = index === activeIndex
            return (
              <button
                key={`${image}-${index}`}
                type="button"
                aria-label={`Show ${property.title} image ${index + 1}`}
                aria-current={isActive ? "true" : undefined}
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "relative aspect-[4/3] w-20 shrink-0 snap-start overflow-hidden rounded-xl border-2 bg-ink-100 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 sm:w-24",
                  isActive
                    ? "border-brand-600 shadow-[0_10px_24px_rgba(5,150,105,0.18)]"
                    : "border-transparent opacity-70 hover:opacity-100",
                )}
              >
                <Image src={image} alt="" fill sizes="96px" className="object-cover" />
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
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
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "absolute top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/35 bg-white/90 text-brand-800 shadow-lg transition-all hover:scale-105 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 motion-reduce:transition-none",
        side === "left" ? "left-3" : "right-3",
      )}
    >
      {children}
    </button>
  )
}

"use client"

import { useCallback, useEffect, useId, useRef, useState, ViewTransition, type ReactNode } from "react"
import { AnimatePresence, motion } from "motion/react"
import { ChevronLeft, ChevronRight, ExternalLink, ImageIcon, Play } from "lucide-react"

import { MediaImage } from "@/components/marketplace/MediaImage"
import { MediaLightbox } from "@/components/marketplace/MediaLightbox"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"
import { CARD_BLUR_DATA_URL } from "@/lib/image-placeholder"
import { springs } from "@/lib/motion"
import { cn } from "@/lib/utils"

/** Viewport width (px) from which the product variant stacks its slides into a crossfading stage. */
const STAGE_QUERY = "(min-width: 768px)"

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
  /**
   * `strip` (default): scroll-snap strip with dots and a thumbnail row below.
   * `product`: square stage on white with `object-contain`. Phones swipe the
   * strip edge to edge (counter pill, dots under the stage); from `md` the
   * slides stack and crossfade, a vertical thumbnail column sits on the left,
   * and a fine pointer hover-zooms the photo.
   */
  variant?: "strip" | "product"
}

/**
 * A swipeable photo and video stage. The slides are a CSS scroll-snap strip
 * (native momentum and snapping, no gesture code), the active slide is tracked
 * with an IntersectionObserver, and a tap opens the lightbox. Phones get a
 * counter chip and dots; `sm` and up add arrows and a thumbnail strip. A video
 * slide shows its poster with a play button and only loads the player on tap.
 *
 * The `product` variant keeps the same slides and swaps the layout with CSS
 * only (one DOM tree, so the shared-element name and `#product-hero-image` stay
 * unique): below `md` the slides are the snap strip, from `md` they are stacked
 * and the active one fades in over the previous.
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
  variant = "strip",
}: SwipeGalleryProps) {
  const isProduct = variant === "product"
  const ringId = useId()
  const reduced = usePrefersReducedMotion()
  const scroller = useRef<HTMLDivElement>(null)
  const activeRef = useRef(0)
  const [active, setActive] = useState(0)
  const [playing, setPlaying] = useState<number | null>(null)
  const [lightbox, setLightbox] = useState<number | null>(null)
  // Keyboard-driven slide changes on the stacked stage skip the crossfade.
  const [instant, setInstant] = useState(false)

  const images = slides.filter((slide): slide is Extract<GallerySlide, { kind: "image" }> => slide.kind === "image")
  const imageUrls = images.map((slide) => slide.src)
  const count = slides.length

  useEffect(() => {
    activeRef.current = active
  }, [active])

  // Track which slide is centred, without a scroll listener. The product stage
  // stacks its slides from `md` (nothing scrolls, every slide would read as
  // visible), so there the observer is paused and `goTo` sets the slide directly.
  useEffect(() => {
    const root = scroller.current
    if (!root || count < 2) return
    const stage = isProduct ? window.matchMedia(STAGE_QUERY) : null
    let io: IntersectionObserver | null = null

    const sync = () => {
      io?.disconnect()
      io = null
      if (stage?.matches) return
      // Back to the strip (window resized past `md`): land it on the current slide.
      const left = activeRef.current * root.clientWidth
      if (Math.abs(root.scrollLeft - left) > 1) root.scrollTo({ left, behavior: "auto" })
      io = new IntersectionObserver(
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
      root.querySelectorAll("[data-index]").forEach((el) => io?.observe(el))
    }

    sync()
    stage?.addEventListener("change", sync)
    return () => {
      stage?.removeEventListener("change", sync)
      io?.disconnect()
    }
  }, [count, isProduct])

  const goTo = useCallback(
    (index: number, instantly = false) => {
      const target = Math.max(0, Math.min(count - 1, index))
      if (isProduct && window.matchMedia(STAGE_QUERY).matches) {
        setInstant(instantly)
        setActive(target)
        setPlaying(null)
        return
      }
      const root = scroller.current
      if (!root) return
      root.scrollTo({
        left: target * root.clientWidth,
        behavior: reduced || instantly ? "auto" : "smooth",
      })
    },
    [count, reduced, isProduct],
  )

  if (count === 0) return <div className={className}>{empty}</div>

  const imageIndexOf = (slideIndex: number) =>
    slides.slice(0, slideIndex).filter((slide) => slide.kind === "image").length

  // The add-to-quote flight starts from this wrapper: the photo on show (the
  // first one until the visitor browses), never a slide scrolled off-screen.
  const heroIndex = slides[active]?.kind === "image" ? active : slides.findIndex((slide) => slide.kind === "image")

  const tile = (
    <span className="flex size-full items-center justify-center bg-linear-to-br from-brand-50 to-brand-100 text-brand-300">
      <ImageIcon aria-hidden="true" className="size-10" />
    </span>
  )

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    // Keyboard-initiated: apply instantly, no scroll or crossfade.
    if (e.key === "ArrowRight") {
      e.preventDefault()
      goTo(active + 1, true)
    } else if (e.key === "ArrowLeft") {
      e.preventDefault()
      goTo(active - 1, true)
    }
  }

  // Hover-zoom (product stage, scale 1.6 via the zoom layer's classes): the origin follows the cursor, written
  // straight to the DOM so a mouse move never re-renders the gallery. Mouse
  // only (touch taps go to the lightbox), photos only, never under reduced motion.
  function trackZoom(e: React.PointerEvent<HTMLDivElement>) {
    const stage = e.currentTarget
    if (e.pointerType !== "mouse" || reduced || slides[active]?.kind !== "image") {
      delete stage.dataset.zoom
      return
    }
    const rect = stage.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    stage.style.setProperty("--zoom-origin", `${x.toFixed(1)}% ${y.toFixed(1)}%`)
    stage.dataset.zoom = "on"
  }

  const showColumn = isProduct && thumbs && count > 1

  /** One thumbnail button; the active one carries the sliding ring. */
  function renderThumb(slide: GallerySlide, index: number, sizeClassName: string, sizes: string) {
    const thumbSrc = slide.kind === "image" ? slide.src : slide.poster
    return (
      <button
        key={`${slide.kind}-${index}`}
        type="button"
        aria-label={slide.kind === "video" ? `Show ${slide.label}` : `Show photo ${imageIndexOf(index) + 1}`}
        aria-current={index === active ? "true" : undefined}
        onClick={() => goTo(index)}
        className={cn(
          "relative shrink-0 rounded-lg transition-[opacity,scale] duration-140 ease-(--ease-out) active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 motion-reduce:duration-150 motion-reduce:active:scale-100",
          sizeClassName,
          index !== active && "opacity-70 hover:opacity-100",
        )}
      >
        {/* Clipping lives on this inner box so the sliding ring below can travel between thumbs. */}
        <span
          className={cn(
            "absolute inset-0 overflow-hidden rounded-lg",
            thumbTone === "dark" ? "bg-ink-900" : isProduct ? "bg-white" : "bg-ink-50",
          )}
        >
          <MediaImage
            src={thumbSrc}
            alt=""
            fill
            unoptimized={unoptimized}
            sizes={sizes}
            className={isProduct ? "object-contain" : "object-cover"}
            fallback={<span className="absolute inset-0 bg-brand-100" />}
          />
          {slide.kind === "video" ? (
            <span className="absolute inset-0 flex items-center justify-center bg-black/35">
              <Play aria-hidden="true" className="size-4 fill-white text-white" />
            </span>
          ) : null}
        </span>
        {index === active ? (
          <motion.span
            layoutId={`${ringId}-thumb-ring`}
            transition={springs.move}
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-0 rounded-lg border-2",
              thumbTone === "dark" ? "border-gold-300" : "border-brand-600",
            )}
          />
        ) : null}
      </button>
    )
  }

  const arrowClassName =
    "absolute top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-[opacity,scale,background-color] duration-140 ease-(--ease-out) hover:bg-black/65 active:scale-[0.97] disabled:opacity-0 motion-reduce:duration-150 motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:flex"

  return (
    <div className={className}>
      <div className={cn(showColumn && "md:grid md:grid-cols-[4.5rem_minmax(0,1fr)] md:gap-3")}>
        {/* Product variant, md+: vertical thumbnails, left of the stage. The inner
            box is absolute so the column is exactly as tall as the stage and scrolls
            when there are more thumbs than fit. First in the DOM so focus follows
            the visual order. */}
        {showColumn ? (
          <div className="relative hidden md:block">
            <div
              role="group"
              aria-label={`${name} gallery thumbnails`}
              className="absolute inset-0 flex flex-col gap-2 overflow-y-auto p-1 scrollbar-none"
            >
              {slides.map((slide, index) => renderThumb(slide, index, "size-16", "64px"))}
            </div>
          </div>
        ) : null}

        <div className="min-w-0">
          <div
            className={cn(
              "relative",
              isProduct && "md:overflow-hidden md:rounded-2xl md:border md:border-border/70 md:bg-white",
            )}
          >
            <div
              ref={scroller}
              role="region"
              aria-roledescription="carousel"
              aria-label={`${name} photos`}
              tabIndex={0}
              onKeyDown={onKeyDown}
              onPointerEnter={isProduct ? trackZoom : undefined}
              onPointerMove={isProduct ? trackZoom : undefined}
              onPointerLeave={
                isProduct
                  ? (e) => {
                      delete e.currentTarget.dataset.zoom
                    }
                  : undefined
              }
              className={cn(
                "group/stage flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain scrollbar-none outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-400",
                aspectClassName,
                // From md the slides stack (absolute) and crossfade; nothing scrolls.
                isProduct && "max-h-[75svh] md:relative md:block md:snap-none md:overflow-hidden",
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
                      sizes={
                        isProduct
                          ? "(min-width: 1024px) 700px, (min-width: 768px) 70vw, 100vw"
                          : "(min-width: 1024px) 50vw, 100vw"
                      }
                      // A blur tint behind a contained photo would show as a letterboxed rectangle.
                      placeholder={isProduct ? undefined : "blur"}
                      blurDataURL={isProduct ? undefined : CARD_BLUR_DATA_URL}
                      className={isProduct ? "object-contain" : "object-cover"}
                      fallback={tile}
                    />
                  ) : null
                return (
                  <div
                    key={`${slide.kind}-${index}`}
                    data-index={index}
                    data-instant={isProduct && instant ? "" : undefined}
                    role="group"
                    aria-roledescription="slide"
                    aria-label={`${index + 1} of ${count}`}
                    className={cn(
                      "relative h-full w-full shrink-0 snap-center",
                      isProduct ? "bg-white" : "bg-ink-50",
                      isProduct &&
                        cn(
                          // Crossfade 200ms ease-out; the 2px blur bridges the two photos.
                          // `visibility` flips at the end of the fade so hidden slides leave
                          // the tab order. Reduced motion: a short plain fade.
                          "md:absolute md:inset-0 md:transition-[opacity,filter,visibility] motion-safe:md:duration-200 motion-reduce:md:duration-150 md:ease-(--ease-out) md:data-instant:transition-none",
                          index !== active && "md:invisible md:opacity-0 motion-safe:md:blur-[2px]",
                        ),
                    )}
                  >
                    {slide.kind === "image" ? (
                      <button
                        type="button"
                        aria-label={`Open photo ${imageIndexOf(index) + 1} full screen`}
                        onClick={() => setLightbox(imageIndexOf(index))}
                        className="absolute inset-0 block cursor-zoom-in outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-400"
                      >
                        {/* Unscaled wrapper: the add-to-quote flight measures this one. */}
                        <span
                          id={isProduct && index === heroIndex ? "product-hero-image" : undefined}
                          className="absolute inset-0 block"
                        >
                          <span
                            className={cn(
                              "absolute inset-0 block",
                              isProduct &&
                                "md:origin-(--zoom-origin) md:transition-[scale] motion-safe:md:duration-200 md:ease-(--ease-out) md:group-data-[zoom=on]/stage:scale-[1.6]",
                            )}
                          >
                            {index === 0 && transitionName ? (
                              // Morph only (same class as the detail skeletons' MorphPlaceholder):
                              // default="none" so the photo never replays a crossfade on its own updates.
                              <ViewTransition name={transitionName} share="morph" default="none">
                                {photo}
                              </ViewTransition>
                            ) : (
                              photo
                            )}
                          </span>
                        </span>
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
                          sizes={
                            isProduct
                              ? "(min-width: 1024px) 700px, (min-width: 768px) 70vw, 100vw"
                              : "(min-width: 1024px) 50vw, 100vw"
                          }
                          className={isProduct ? "object-contain" : "object-cover"}
                          fallback={
                            <span className="absolute inset-0 bg-linear-to-br from-brand-100 via-brand-200 to-gold-100" />
                          }
                        />
                        <button
                          type="button"
                          aria-label={`Play ${slide.label}`}
                          onClick={() => setPlaying(index)}
                          className="absolute left-1/2 top-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/92 text-brand-700 shadow-lg transition-[scale] duration-140 ease-(--ease-out) active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:hover:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100"
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
                <span
                  className={cn(
                    "pointer-events-none absolute right-2 top-2 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold tabular-nums text-white backdrop-blur-sm sm:right-3 sm:top-3",
                    // The thumbnail column shows the position on the stage layout.
                    isProduct && "md:hidden",
                  )}
                >
                  {/* initial={false}: the first number is plain server markup; only changes animate. */}
                  <AnimatePresence initial={false}>
                    <motion.span
                      key={active}
                      className="inline-block"
                      initial={{ opacity: 0, transform: "translateY(4px)" }}
                      animate={{ opacity: 1, transform: "translateY(0px)" }}
                      transition={springs.snappy}
                    >
                      {active + 1}
                    </motion.span>
                  </AnimatePresence>{" "}
                  / {count}
                </span>
                {/* Strip variant: dots over the photo. The product stage is white, so its dots sit below it. */}
                {!isProduct ? (
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
                          "h-1.5 rounded-full bg-white/70 shadow-sm transition-[width,background-color] duration-200 ease-(--ease-out) motion-reduce:transition-none",
                          index === active ? "w-5 bg-white" : "w-1.5",
                        )}
                      />
                    ))}
                  </div>
                ) : null}
                <button
                  type="button"
                  aria-label="Previous photo"
                  onClick={() => goTo(active - 1)}
                  disabled={active === 0}
                  className={cn(arrowClassName, "left-3")}
                >
                  <ChevronLeft aria-hidden="true" className="size-5" />
                </button>
                <button
                  type="button"
                  aria-label="Next photo"
                  onClick={() => goTo(active + 1)}
                  disabled={active === count - 1}
                  className={cn(arrowClassName, "right-3")}
                >
                  <ChevronRight aria-hidden="true" className="size-5" />
                </button>
              </>
            ) : null}
          </div>

          {isProduct && count > 1 ? (
            <div aria-hidden="true" className="flex justify-center gap-1.5 pt-3 md:hidden">
              {slides.map((_, index) => (
                <span
                  key={index}
                  className={cn(
                    "size-1.5 rounded-full transition-[scale,background-color] duration-200 ease-(--ease-out) motion-reduce:transition-none motion-reduce:duration-150",
                    index === active ? "scale-125 bg-brand-600" : "bg-ink-300",
                  )}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {!isProduct && thumbs && count > 1 ? (
        <div
          className={cn(
            "hidden gap-2 overflow-x-auto p-3 scrollbar-none sm:flex",
            thumbTone === "dark" && "bg-ink-950/60",
          )}
          aria-label={`${name} gallery thumbnails`}
          role="group"
        >
          {slides.map((slide, index) => renderThumb(slide, index, "size-14", "56px"))}
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

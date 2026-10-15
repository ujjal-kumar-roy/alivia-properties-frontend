"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  ViewTransition,
  type ComponentProps,
  type ReactNode,
} from "react"

import {
  forgetMorph,
  isHistoryTraversal,
  markMorphLanded,
  morphFor,
  morphLanded,
  rememberMorph,
} from "@/lib/morph-handoff"
import { cn } from "@/lib/utils"

/*
 * The client ends of the card photo -> detail hero morph across loading
 * skeletons (the why is in src/lib/morph-handoff.ts): <MorphLink> on the card,
 * <MorphLoading> around every route loading skeleton a tap can commit first,
 * and <MorphPlaceholder> in the detail skeletons' hero slot.
 */

const noSubscribe = () => () => {}

/**
 * A card link that hands its photo to the page it opens. `morph` is the
 * <ViewTransition name> the card photo carries; leave it unset when the card
 * has no named photo (no slug, no cover, morph turned off).
 */
export function MorphLink({
  morph,
  onClick,
  ...props
}: ComponentProps<typeof Link> & { morph?: string }) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        onClick?.(event)
        if (morph) rememberMorph(event.currentTarget, event, morph)
      }}
    />
  )
}

/**
 * Wraps a route's loading skeleton (`children`). Two jobs:
 *
 * - Right after a card for this URL was tapped, it shows `detail[kind]` (the
 *   detail skeleton with the photo slot) instead. Next commits whichever
 *   loading boundary it has ready first, often the listing's or the site's,
 *   not the detail page's own, so each of them has to offer the photo slot.
 * - Next scrolls a newly opened page to its top from the first element of its
 *   loading state, but a loading.tsx that uses a client component (this one)
 *   starts with that chunk's <script async>, which React hoists into <head>,
 *   and Next then finds nothing to scroll. So scroll here, in the same commit,
 *   the way Next does: only when the top of the skeleton is out of view. Not on
 *   a fresh load or back/forward, where the browser owns the offset.
 */
export function MorphLoading({
  detail,
  children,
}: {
  detail?: Partial<Record<string, ReactNode>>
  children: ReactNode
}) {
  const pathname = usePathname()
  // Read once: the skeleton can re-render while the page streams in.
  const [kind] = useState(() => morphFor(pathname)?.kind)
  const top = useRef<HTMLDivElement>(null)
  // False while hydrating server HTML (a fresh load), true when a client-side
  // navigation rendered this skeleton. The ref keeps the first render's value.
  const clientRendered = useSyncExternalStore(noSubscribe, () => true, () => false)
  const openedInApp = useRef(clientRendered)

  useLayoutEffect(() => {
    const el = top.current
    if (!el || !openedInApp.current || isHistoryTraversal()) return
    const y = el.getBoundingClientRect().top
    if (y < 0 || y > window.innerHeight) window.scrollTo(0, 0)
  }, [])

  const swap = kind ? detail?.[kind] : undefined
  return (
    <>
      {/* Zero height: marks where the skeleton starts. */}
      <div ref={top} aria-hidden="true" />
      {swap ?? children}
    </>
  )
}

/**
 * The hero photo slot of a detail page's loading skeleton. Right after a card
 * for this page was tapped it shows that card's photo under the card's
 * <ViewTransition name>, so the photo morphs from the card into this slot; the
 * real hero carries the same name in the same box and takes over in place.
 * Otherwise (a direct visit, history navigation, a link without a photo) it is
 * a skeleton block, or nothing with `skeleton={false}` (when it sits over a
 * skeleton that already draws the block).
 *
 * `className` sizes the box in both cases: give it the real hero's box.
 */
export function MorphPlaceholder({
  className,
  skeleton = true,
}: {
  className?: string
  skeleton?: boolean
}) {
  const pathname = usePathname()
  // Read once: the skeleton can re-render while the page streams in.
  const [handoff] = useState(() => morphFor(pathname))
  // The first placeholder is where the card photo flies to; a later one (the
  // detail page's own skeleton after the listing's) takes over in place.
  const [flight] = useState(() => Boolean(handoff && !morphLanded(handoff)))

  // Drop the hand-off once this skeleton leaves for good: the real page, or
  // another page, replaced it (a skeleton that replaces this one, say the
  // detail page's own after the listing's, read it while rendering). A tick
  // later, so Strict Mode's mount-unmount-mount check does not drop it.
  const mounted = useRef(false)
  useEffect(() => {
    if (!handoff) return
    markMorphLanded(handoff)
    mounted.current = true
    return () => {
      mounted.current = false
      setTimeout(() => {
        if (!mounted.current) forgetMorph(handoff)
      })
    }
  }, [handoff])

  if (!handoff) {
    return skeleton ? <div className={cn("skeleton rounded-lg", className)} /> : null
  }

  return (
    <div
      data-morph-placeholder=""
      className={cn("relative overflow-hidden rounded-lg bg-ink-100", className)}
    >
      {/* `morph-in`: the flight from the card, which also rounds the corners
          on the way (globals.css). */}
      <ViewTransition
        name={handoff.name}
        share={flight ? "morph morph-in" : "morph"}
        default="none"
      >
        {/* A plain <img> on purpose: it is the exact URL the card already
            shows, so it paints from memory in the frame the morph captures.
            next/image would request another size, lazy-load and decode it
            async. The real hero (with its priority) replaces it on arrival. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={handoff.src}
          alt=""
          decoding="sync"
          className="absolute inset-0 size-full object-cover"
        />
      </ViewTransition>
    </div>
  )
}

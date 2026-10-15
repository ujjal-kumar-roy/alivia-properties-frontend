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
} from "react"

import { forgetMorph, lastNavigationWasTraverse, morphFor, rememberMorph } from "@/lib/morph-handoff"
import { cn } from "@/lib/utils"

const noSubscribe = () => () => {}

/*
 * The two ends of the card photo -> detail hero morph across a loading
 * skeleton (the why is in src/lib/morph-handoff.ts): <MorphLink> on the card,
 * <MorphPlaceholder> in the destination route's loading.tsx.
 */

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
  // False while hydrating server HTML (a fresh load), true when a client-side
  // navigation rendered this skeleton. The ref keeps the first render's value.
  const clientRendered = useSyncExternalStore(noSubscribe, () => true, () => false)
  const openedInApp = useRef(clientRendered)

  // Next scrolls a newly opened page to its top from the first element of its
  // loading state. A loading.tsx that uses a client component (this one)
  // starts with that chunk's <script async>, which React hoists into <head>,
  // and Next then finds nothing to scroll: the skeleton would open at the old
  // page's scroll offset, the hero slot above the screen (and the morph with
  // nowhere visible to land). So scroll here, in the same commit. Not on a
  // fresh load or back/forward: the browser owns the offset there.
  useLayoutEffect(() => {
    if (openedInApp.current && window.scrollY > 0 && !lastNavigationWasTraverse()) {
      window.scrollTo(0, 0)
    }
  }, [])

  // The skeleton leaves when the real page (or another page) replaces it.
  useEffect(() => {
    if (!handoff) return
    return () => forgetMorph(handoff)
  }, [handoff])

  if (!handoff) {
    return skeleton ? <div className={cn("skeleton rounded-lg", className)} /> : null
  }

  return (
    <div
      data-morph-placeholder=""
      className={cn("relative overflow-hidden rounded-lg bg-ink-100", className)}
    >
      <ViewTransition name={handoff.name} share="morph" default="none">
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

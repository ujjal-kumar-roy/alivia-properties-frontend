"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { ArrowLeft } from "lucide-react"
import { AnimatePresence, motion, type Variants } from "motion/react"

import { GuideAvatar } from "@/components/common/guide-avatar"
import { MobileActionBar } from "@/components/common/mobile-action-bar"
import { ProgressBar } from "@/components/common/progress-bar"
import { springs } from "@/lib/motion"
import { cn } from "@/lib/utils"

/**
 * Last screen shown by any shell, so a shell that mounts fresh (the wizard hands
 * over from the picks to the form, and back) still knows which way to slide.
 */
let lastNav: { step: number; at: number } | null = null

const screenVariants: Variants = {
  enter: (dir: number) => ({ x: dir * 40, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: springs.move },
  exit: (dir: number) => ({
    x: dir * -24,
    opacity: 0,
    transition: { duration: 0.15, ease: "easeIn" },
  }),
}

/** Handed to the action so it can ignore taps that land right after a screen change. */
export type GuidedActionContext = {
  /**
   * Wraps a click handler: it does nothing until `ms` after the current screen
   * appeared. The button keeps its place on the thumb bar between screens, so a
   * double tap would otherwise also press the next screen's button.
   */
  guard: (handler: () => void, ms?: number) => () => void
}

type GuidedShellProps = {
  /** Zero-based index of this screen in the whole flow. */
  step: number
  /** Number of screens in the whole flow. */
  total: number
  /** What the guide says on this screen (short, friendly, one thought). */
  bubble: string
  mood?: "idle" | "cheer" | "think"
  /** Back always exists: a handler, or a link when nothing earlier is in the flow. */
  onBack?: () => void
  backHref?: string
  backLabel?: string
  /**
   * The one primary button. Called twice: "bar" for the thumb bar on phones,
   * "inline" for the in-page button from md up (the bar is hidden there).
   */
  action: (placement: "bar" | "inline", context: GuidedActionContext) => ReactNode
  /**
   * Show the guided chrome (progress, guide, bar) on phones only. The children
   * are then expected to render as a classic form from md up, with their own
   * submit button, so no inline action is added.
   */
  phonesOnly?: boolean
  /**
   * Slide the children in and out when `step` changes (next from the right, back
   * from the left). Turn off when the children keep state in the DOM across
   * steps (a form that shows one screen at a time), since a step change swaps
   * the children for a fresh copy.
   */
  animateContent?: boolean
  children: ReactNode
  className?: string
}

/**
 * The guided-flow frame: a glass progress capsule that fills per screen with a
 * step count and an always-there back button, the Alivia guide with a speech
 * bubble that changes per screen, the question itself, and one full-width
 * action pinned to the thumb bar. Pacing and presentation only: the screens
 * own their fields and validation.
 */
export function GuidedShell({
  step,
  total,
  bubble,
  mood = "idle",
  onBack,
  backHref,
  backLabel = "Back",
  action,
  phonesOnly = false,
  animateContent = true,
  children,
  className,
}: GuidedShellProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const firstRender = useRef(true)
  const arrivedAt = useRef(0)

  // Which way this screen slides in: forward when the step grew, back otherwise.
  const [nav, setNav] = useState(() => {
    const recent = lastNav && Date.now() - lastNav.at < 1500 && lastNav.step !== step ? lastNav : null
    return { step, dir: recent && step < recent.step ? -1 : 1, fresh: Boolean(recent) }
  })
  if (nav.step !== step) setNav({ step, dir: step > nav.step ? 1 : -1, fresh: true })
  const dir = nav.dir

  useEffect(() => {
    lastNav = { step, at: Date.now() }
  }, [step])

  const guard = useCallback(
    (handler: () => void, ms = 300) =>
      () => {
        if (Date.now() - arrivedAt.current < ms) return
        handler()
      },
    [],
  )

  // A new screen should start at the top of the flow, not wherever the last one was scrolled to.
  useEffect(() => {
    arrivedAt.current = Date.now()
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    const root = rootRef.current
    if (root && root.getBoundingClientRect().top < 0) {
      root.scrollIntoView({ block: "start" })
    }
  }, [step])

  const progress = (step / total) * 100
  const hide = phonesOnly ? "md:hidden" : ""
  const backClass = "btn-glass size-10 shrink-0 !p-0"

  return (
    <div ref={rootRef} className={cn("relative scroll-mt-2", className)}>
      <div
        className={cn(
          "liquid-glass-nav sticky top-2 z-30 flex items-center gap-2.5 rounded-2xl border p-1.5 pr-3",
          hide,
        )}
      >
        {backHref ? (
          <Link href={backHref} aria-label={backLabel} className={backClass}>
            <ArrowLeft aria-hidden="true" className="size-4" />
          </Link>
        ) : (
          <button type="button" onClick={onBack} aria-label={backLabel} className={backClass}>
            <ArrowLeft aria-hidden="true" className="size-4" />
          </button>
        )}
        <ProgressBar value={progress} label="Quote progress" className="min-w-0 flex-1" />
        <span className="shrink-0 text-xs font-bold tabular-nums text-ink-700">
          <span className="sr-only">Step </span>
          {step + 1}
          <span className="text-ink-500"> of {total}</span>
        </span>
      </div>

      <div className={cn("mt-3 flex items-start gap-3", hide)}>
        <GuideAvatar key={mood} mood={mood} size={48} className="mt-0.5" />
        <p
          key={bubble}
          role="status"
          className="speech-bubble anim-slide-up min-w-0 flex-1 text-[0.9375rem] font-bold leading-snug"
        >
          {bubble}
        </p>
      </div>

      {animateContent ? (
        // Clipped sideways so the sliding screen never widens the page; the small
        // negative margin keeps card shadows from being cut at the edges.
        <div className="relative mt-4 -mx-1 overflow-x-clip px-1">
          <AnimatePresence mode="popLayout" custom={dir} initial={nav.fresh}>
            <motion.div
              key={step}
              custom={dir}
              variants={screenVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      ) : (
        <div className="mt-4">{children}</div>
      )}

      <MobileActionBar label="Next step">{action("bar", { guard })}</MobileActionBar>
      {!phonesOnly ? (
        <div className="mt-6 hidden justify-end md:flex">{action("inline", { guard })}</div>
      ) : null}
    </div>
  )
}

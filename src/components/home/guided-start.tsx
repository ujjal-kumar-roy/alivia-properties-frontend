"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import {
  ArrowRight,
  Boxes,
  Building2,
  ChevronLeft,
  KeyRound,
  TrendingUp,
  type LucideIcon,
} from "lucide-react"

import { GuideAvatar } from "@/components/common/guide-avatar"
import { ProgressBar } from "@/components/common/progress-bar"
import { ROUTES } from "@/config/routes.config"
import { haptic } from "@/lib/celebrate"
import { cn } from "@/lib/utils"

type Department = { slug: string; name: string }

type Option = { id: string; label: string; icon?: LucideIcon; href?: string }

type Intent = "apartment" | "property" | "materials" | "invest"

const INTENTS: { id: Intent; label: string; icon: LucideIcon }[] = [
  { id: "apartment", label: "Buy an apartment", icon: Building2 },
  { id: "property", label: "Buy or rent a property", icon: KeyRound },
  { id: "materials", label: "Source building materials", icon: Boxes },
  { id: "invest", label: "Invest with Alivia", icon: TrendingUp },
]

const BUDGETS: Option[] = [
  { id: "any", label: "Any budget", href: ROUTES.PROJECTS },
  { id: "u50", label: "Under ৳50L", href: `${ROUTES.PROJECTS}?maxPrice=5000000` },
  { id: "50-100", label: "৳50L-1Cr", href: `${ROUTES.PROJECTS}?minPrice=5000000&maxPrice=10000000` },
  { id: "100+", label: "৳1Cr+", href: `${ROUTES.PROJECTS}?minPrice=10000000` },
]

const PURPOSES: Option[] = [
  { id: "sale", label: "Buy", href: `${ROUTES.PROPERTIES}?purpose=sale` },
  { id: "rent", label: "Rent", href: `${ROUTES.PROPERTIES}?purpose=rent` },
]

const PROMPTS: Record<Intent, { ask: string; cta: string }> = {
  apartment: { ask: "Nice. What budget feels right?", cta: "Show apartments" },
  property: { ask: "Are you buying or renting?", cta: "Show properties" },
  materials: { ask: "Which kind of materials do you need?", cta: "Browse materials" },
  invest: { ask: "Great choice. Let's talk investing.", cta: "Explore investing" },
}

/**
 * A two-question gateway on the home page: pick what brings you here, then
 * narrow it once, and land on a correctly filtered page. One question per
 * screen, a progress bar that fills, chunky choice cards, a guide that reacts,
 * and a primary button that stays disabled until you choose. Every answer maps
 * to a real filtered route; nothing here is invented.
 */
export function GuidedStart({ departments }: { departments: Department[] }) {
  const [intent, setIntent] = useState<Intent | null>(null)
  const [answer, setAnswer] = useState<Option | null>(null)
  // Re-keying the guide replays its one-shot reaction on every new answer.
  const [reaction, setReaction] = useState(0)
  const [mood, setMood] = useState<"idle" | "think" | "cheer">("idle")
  // After a step change the pressed button unmounts; move focus to the new options so
  // keyboard and screen-reader users are not dropped onto the page. Never on first render.
  const optionsRef = useRef<HTMLDivElement>(null)
  const refocus = useRef(false)
  useEffect(() => {
    if (!refocus.current) return
    refocus.current = false
    optionsRef.current?.querySelector<HTMLButtonElement>("button")?.focus()
  }, [intent])

  const materialOptions: Option[] = departments.slice(0, 4).map((d) => ({
    id: d.slug,
    label: d.name,
    href: ROUTES.MARKETPLACE_CATEGORY(d.slug),
  }))

  const step2: Option[] =
    intent === "apartment"
      ? BUDGETS
      : intent === "property"
        ? PURPOSES
        : intent === "materials"
          ? materialOptions
          : []

  // Nothing to narrow (investing, or no departments loaded): straight to the final button.
  const finalHref =
    intent === "invest"
      ? ROUTES.BECOME_INVESTOR
      : intent === "materials" && step2.length === 0
        ? ROUTES.MARKETPLACE
        : (answer?.href ?? null)
  const step = intent === null ? 0 : step2.length === 0 || answer ? 2 : 1
  const progress = step === 0 ? 10 : step === 1 ? 55 : 100

  function pickIntent(next: Intent) {
    refocus.current = true
    haptic("tap")
    setReaction((n) => n + 1)
    setMood("think")
    setIntent(next)
    setAnswer(null)
  }

  function pickAnswer(option: Option) {
    haptic("tap")
    setReaction((n) => n + 1)
    setMood("cheer")
    setAnswer(option)
  }

  function back() {
    refocus.current = true
    setReaction((n) => n + 1)
    setMood("idle")
    setIntent(null)
    setAnswer(null)
  }

  const ask =
    intent === null
      ? "What brings you to Alivia today?"
      : answer
        ? "Got it. Your shortlist is ready."
        : intent === "materials" && step2.length === 0
          ? "Let's open the marketplace."
          : PROMPTS[intent].ask

  const options = intent === null ? null : step2

  return (
    <section
      aria-labelledby="guided-start-title"
      className="liquid-glass mx-auto w-full max-w-3xl rounded-3xl border p-3 sm:p-5"
    >
      <h2 id="guided-start-title" className="sr-only">
        Find what you need
      </h2>

      <div className="flex items-center gap-2.5">
        {intent !== null && (
          <button
            type="button"
            onClick={back}
            aria-label="Back to the first question"
            className="btn-glass size-9 shrink-0 !min-h-9 !min-w-9 !p-0"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
          </button>
        )}
        <ProgressBar value={progress} label="Guided start progress" className="flex-1" />
      </div>

      <div className="mt-3 flex items-start gap-3">
        <GuideAvatar key={reaction} mood={mood} size={52} />
        {/* The live region stays mounted; only the bubble inside is re-keyed to replay its pop. */}
        <div aria-live="polite" className="min-w-0 flex-1">
          <p key={ask} className="speech-bubble anim-pop-in text-[0.9375rem] sm:text-base">
            {ask}
          </p>
        </div>
      </div>

      <div
        ref={optionsRef}
        className={cn(
          "mt-3 grid gap-2",
          intent === null ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2",
        )}
      >
        {intent === null
          ? INTENTS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => pickIntent(id)}
                className="choice-card !min-h-[3.5rem] !gap-2.5 !px-3 !py-2 text-[0.8125rem] leading-snug sm:text-sm"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <Icon aria-hidden="true" className="size-[1.15rem]" />
                </span>
                <span className="min-w-0 flex-1">{label}</span>
              </button>
            ))
          : options?.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={answer?.id === option.id}
                onClick={() => pickAnswer(option)}
                className="choice-card !min-h-[3.25rem] !justify-center !px-3 !py-2 text-center text-[0.8125rem] sm:text-sm"
              >
                {option.label}
              </button>
            ))}
      </div>

      {intent !== null && (
        <div className="mt-3">
          {finalHref ? (
            <Link href={finalHref} className="btn-tactile btn-tactile--block">
              {PROMPTS[intent].cta}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          ) : (
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="btn-tactile btn-tactile--block"
            >
              {PROMPTS[intent].cta}
            </button>
          )}
        </div>
      )}
    </section>
  )
}

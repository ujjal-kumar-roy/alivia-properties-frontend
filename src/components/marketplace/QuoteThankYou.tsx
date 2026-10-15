"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useEffect, useRef } from "react"
import { Phone } from "lucide-react"
import { motion, useReducedMotion } from "motion/react"

import { GuideAvatar } from "@/components/common/guide-avatar"
import { ROUTES } from "@/config/routes.config"
import { celebrate } from "@/lib/celebrate"
import { springs } from "@/lib/motion"

type QuoteThankYouProps = {
  /** Short reference taken from the quote or batch id. */
  reference?: string
  /** How many sellers the request went to (0 or 1 means "matched for you"). */
  supplierCount: number
  phone: string
  phoneRaw: string
}

const NEXT_STEPS = [
  "Sellers review your request.",
  "They reply by phone or email, most within 24 hours.",
  "Compare the replies and choose the best fit.",
]

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`
}

/** What was sent, in plain words. The reply time is in the steps below, so it is not repeated here. */
function sentSummary(itemCount: number | null, sellerCount: number) {
  if (itemCount) {
    // The quote list sends one request per product: `?count={sellers}&items={n}`.
    const to = sellerCount > 0 ? plural(sellerCount, "seller") : "the sellers"
    return `Your request for ${plural(itemCount, "item")} went to ${to}.`
  }
  return sellerCount > 1
    ? `Thanks, your request was sent to ${sellerCount} sellers.`
    : "Thanks, we have sent your request to verified sellers."
}

/**
 * The moment after a quote is sent. The Alivia guide cheers and confetti bursts
 * once from it (honours reduced motion), then the page says what happens next.
 */
export function QuoteThankYou({ reference, supplierCount, phone, phoneRaw }: QuoteThankYouProps) {
  // Read here rather than from the page props: the quote list adds `items` to the redirect.
  const itemsParam = Number(useSearchParams().get("items"))
  const itemCount = Number.isInteger(itemsParam) && itemsParam > 0 ? itemsParam : null
  const avatarRef = useRef<HTMLSpanElement>(null)
  const celebrated = useRef(false)
  // Under reduced motion the badge and tick are simply there (no scale, no draw).
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (celebrated.current) return
    celebrated.current = true
    celebrate({ origin: avatarRef.current })
  }, [])

  return (
    <div className="mx-auto max-w-xl">
      <div className="flex items-start gap-3">
        <span ref={avatarRef} className="mt-0.5 inline-flex">
          <GuideAvatar mood="cheer" size={64} />
        </span>
        <p className="speech-bubble anim-slide-up min-w-0 flex-1 text-[0.9375rem] font-bold leading-snug">
          Done! Your request is on its way to verified sellers.
        </p>
      </div>

      <div className="enter-cascade mt-4 rounded-2xl border border-border/70 bg-white p-5 text-center shadow-(--shadow-card) sm:p-8">
        {/* The outer span takes part in the copy cascade; the badge inside springs in. */}
        <span className="mx-auto flex size-12 items-center justify-center">
          <motion.span
            className="flex size-12 items-center justify-center rounded-full bg-green-50 text-green-700"
            initial={reduceMotion ? false : { scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ ...springs.sheet, delay: 0.15 }}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-6"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <motion.path
                d="M20 6 9 17l-5-5"
                initial={reduceMotion ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1], delay: 0.35 }}
              />
            </svg>
          </motion.span>
        </span>
        <h1 className="mt-3 font-heading text-2xl font-semibold text-ink-900 sm:text-3xl">
          Quote request sent
        </h1>
        <p className="mt-2 text-sm text-ink-600 sm:text-base">
          {sentSummary(itemCount, supplierCount)}
        </p>

        {reference ? (
          <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-4 py-1.5 text-xs font-semibold text-brand-800">
            Reference
            <span className="font-mono tracking-wider">{reference}</span>
          </div>
        ) : null}

        <ol className="mt-5 grid gap-2 text-left">
          {NEXT_STEPS.map((text, index) => (
            <li key={text} className="flex items-center gap-3 rounded-xl bg-ink-50/70 px-3 py-2.5">
              <span
                aria-hidden="true"
                className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white"
              >
                {index + 1}
              </span>
              <span className="text-sm font-medium text-ink-800">{text}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
        <Link href={ROUTES.MARKETPLACE} className="btn-tactile btn-tactile--block">
          Back to marketplace
        </Link>
        <Link href={ROUTES.MARKETPLACE_REQUEST} className="btn-glass min-h-11">
          Submit another request
        </Link>
      </div>

      <p className="mt-4 text-center text-xs text-ink-500">
        Need to speak to someone now?{" "}
        <a
          href={`tel:${phoneRaw}`}
          className="inline-flex min-h-9 items-center gap-1 font-semibold text-brand-700"
        >
          <Phone aria-hidden="true" className="size-3.5" />
          {phone}
        </a>
      </p>
    </div>
  )
}

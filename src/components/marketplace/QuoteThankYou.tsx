"use client"

import Link from "next/link"
import { useEffect, useRef } from "react"
import { Phone } from "lucide-react"
import { motion } from "motion/react"

import { GuideAvatar } from "@/components/common/guide-avatar"
import { ROUTES } from "@/config/routes.config"
import { celebrate, haptic } from "@/lib/celebrate"
import { springs } from "@/lib/motion"

type QuoteThankYouProps = {
  /** Short reference taken from the quote or batch id. */
  reference?: string
  /** How many suppliers the request went to (0 or 1 means "matched for you"). */
  supplierCount: number
  phone: string
  phoneRaw: string
}

const NEXT_STEPS = [
  "Sellers review your request.",
  "They reply by phone or email, most within 24 hours.",
  "Compare the replies and choose the best fit.",
]

/**
 * The moment after a quote is sent. The Alivia guide cheers and confetti bursts
 * once from it (honours reduced motion), then the page says what happens next.
 */
export function QuoteThankYou({ reference, supplierCount, phone, phoneRaw }: QuoteThankYouProps) {
  const avatarRef = useRef<HTMLSpanElement>(null)
  const celebrated = useRef(false)

  useEffect(() => {
    if (celebrated.current) return
    celebrated.current = true
    haptic("success")
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
            initial={{ scale: 0.4, opacity: 0 }}
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
                initial={{ pathLength: 0 }}
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
          {supplierCount > 1
            ? `Thanks, your request was sent to ${supplierCount} suppliers. Most reply within 24 hours via email or phone.`
            : "Thanks, we have routed your request to verified suppliers. Most reply within 24 hours via email or phone."}
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

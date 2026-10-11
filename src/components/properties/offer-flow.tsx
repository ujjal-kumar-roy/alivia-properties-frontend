"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { HandCoins } from "lucide-react"
import { offersService } from "@/services/offers.service"
import { ApiError } from "@/services/http-client"
import { ROUTES } from "@/config/routes.config"
import { celebrate } from "@/lib/celebrate"

function formatBdt(amount: number): string {
  if (amount >= 10000000) return `৳${(amount / 10000000).toFixed(2)} Cr`
  if (amount >= 100000) return `৳${(amount / 100000).toFixed(2)} L`
  return `৳${Math.round(amount).toLocaleString("en-BD")}`
}

const CONTINGENCY_OPTIONS = [
  "Bank financing",
  "Legal due diligence",
  "Price inclusive of fixtures",
  "Handover within 30 days",
]

export function OfferFlow({
  propertyId,
  propertyTitle,
  listingPrice,
  sellerName,
  embedded = false,
}: {
  propertyId: string
  propertyTitle: string
  listingPrice: number
  sellerId?: string
  sellerName: string
  /** Inside an accordion: the form is shown straight away, with no card or heading of its own. */
  embedded?: boolean
}) {
  const { data: session } = useSession()
  const [open, setOpen] = useState(embedded)
  const [offerAmount, setOfferAmount] = useState(listingPrice)
  const [message, setMessage] = useState("")
  const [contingencies, setContingencies] = useState<string[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const diffPct = useMemo(
    () => ((offerAmount - listingPrice) / listingPrice) * 100,
    [listingPrice, offerAmount],
  )

  function toggleContingency(value: string) {
    setContingencies((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    )
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()

    if (!session?.accessToken) {
      setSubmitError("Please sign in first to send an offer.")
      return
    }

    setSubmitting(true)
    setSubmitError(null)

    try {
      await offersService.create(
        {
          propertyId,
          offerPrice: offerAmount,
          contingencies,
          message: message.trim() || undefined,
        },
        session.accessToken,
      )
      setSubmitted(true)
      celebrate()
    } catch (error) {
      setSubmitError(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Could not send your offer right now.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={embedded ? undefined : "surface-card p-5"}>
      {!embedded && (
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gold-100 text-gold-700">
            <HandCoins className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-sans text-lg font-semibold text-ink-900">Make an Offer</h3>
            <p className="text-xs text-ink-500">Negotiate directly with {sellerName}</p>
          </div>
        </div>
      )}

      {!open ? (
        <Button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full rounded-full bg-gold-500 text-ink-900 hover:bg-gold-400"
        >
          Submit Offer
        </Button>
      ) : submitted ? (
        <div className="rounded-[1rem] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          Offer sent successfully. The seller can now review your proposal.
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-medium text-ink-600">Your offer</span>
              <span
                className={
                  diffPct < 0
                    ? "font-semibold text-rose-600"
                    : diffPct > 0
                      ? "font-semibold text-emerald-600"
                      : "font-semibold text-ink-500"
                }
              >
                {diffPct > 0 ? "+" : ""}
                {diffPct.toFixed(1)}% vs list
              </span>
            </div>
            <input
              type="number"
              value={offerAmount}
              onChange={(e) => setOfferAmount(Number(e.target.value))}
              min={0}
              step={1000}
              className="w-full rounded-full border border-border bg-white px-4 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-600"
            />
            <p className="mt-1 text-xs text-ink-500">{formatBdt(offerAmount)}</p>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">Contingencies</p>
            <div className="flex flex-wrap gap-2">
              {CONTINGENCY_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggleContingency(option)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    contingencies.includes(option)
                      ? "border-brand-600 bg-brand-50 text-brand-800"
                      : "border-border text-ink-600 hover:border-brand-300"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <textarea
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={`Introduce your offer for ${propertyTitle}…`}
            className="w-full rounded-[1rem] border border-border bg-white px-4 py-3 text-sm text-ink-900 outline-none focus:border-brand-600"
          />

          {submitError && <p className="text-xs text-destructive">{submitError}</p>}

          <p className="text-xs text-ink-500">
            Re: <span className="font-medium text-ink-700">{propertyTitle}</span>
          </p>

          <div className="flex gap-2">
            {session?.accessToken ? (
              <Button type="submit" className="flex-1 rounded-full bg-brand-700 text-white hover:bg-brand-800" disabled={submitting}>
                {submitting ? "Sending…" : "Send Offer"}
              </Button>
            ) : (
              <Link href={ROUTES.LOGIN} className="flex-1">
                <Button type="button" variant="outline" className="w-full rounded-full">
                  Sign In to Offer
                </Button>
              </Link>
            )}
            {!embedded && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="rounded-full"
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      )}
    </div>
  )
}

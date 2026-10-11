"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { reviewsService } from "@/services/reviews.service"
import { ApiError } from "@/services/http-client"
import { ROUTES } from "@/config/routes.config"
import { formatRelative } from "@/utils/format-date"
import { StarRating } from "@/components/common/star-rating"
import type { Review, ReviewTargetType } from "@/types/review.types"

function averageRating(reviews: Review[]): number {
  if (reviews.length === 0) return 0
  return reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
}

export function ReviewsSection({
  targetType,
  targetId,
  embedded = false,
}: {
  targetType: ReviewTargetType
  targetId: string
  /** Inside an accordion: no card or heading of its own (the section supplies them). */
  embedded?: boolean
}) {
  const { data: session } = useSession()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState(5)
  const [body, setBody] = useState("")
  const [title, setTitle] = useState("")
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await reviewsService.list(
          targetType === "agent" ? { agentId: targetId, limit: 20 } : { propertyId: targetId, limit: 20 },
        )
        setReviews(res.data)
      } catch {
        // A failed lookup reads as "no reviews yet" instead of an unhandled rejection.
        setReviews([])
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [targetId, targetType])

  const average = useMemo(() => averageRating(reviews), [reviews])

  async function submitReview(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!session?.accessToken) {
      setSubmitError("Please sign in first to leave a review.")
      return
    }

    if (targetType === "project") {
      setSubmitError("Apartment reviews are not enabled on the API yet.")
      return
    }

    setSubmitting(true)
    setSubmitError(null)

    try {
      const review = await reviewsService.create(
        {
          ...(targetType === "agent" ? { agentId: targetId } : { propertyId: targetId }),
          rating,
          title: title.trim() || undefined,
          body: body.trim(),
        },
        session.accessToken,
      )
      setReviews((current) => [review, ...current])
      setTitle("")
      setBody("")
      setRating(5)
    } catch (error) {
      setSubmitError(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Could not submit your review right now.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={embedded ? undefined : "surface-card p-5"}>
      {!embedded && (
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gold-100 text-gold-700">
            <Star className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-h3">Reviews</h3>
            <p className="text-xs text-ink-500">Verified guest ratings</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-[0.38fr_0.62fr]">
        <div className="rounded-[1rem] border border-border bg-ink-50 p-4 text-center">
          <p className="text-4xl font-bold text-ink-900">{average.toFixed(1)}</p>
          <StarRating value={average} count={reviews.length} showValue={false} size="md" className="justify-center" />
          <p className="mt-2 text-xs text-ink-500">{reviews.length} review{reviews.length === 1 ? "" : "s"}</p>
        </div>

        <div className="space-y-3">
          {loading && <div className="rounded-[1rem] border border-dashed border-border/60 p-6 text-sm text-ink-500">Loading reviews…</div>}
          {!loading && reviews.length === 0 && (
            <div className="rounded-[1rem] border border-dashed border-border/60 p-6 text-sm text-ink-500">
              No reviews yet. Be the first to leave one.
            </div>
          )}
          {!loading && reviews.slice(0, 4).map((review) => (
            <div key={review.id} className="rounded-[1rem] border border-border bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink-900">{review.author?.name ?? "Verified buyer"}</p>
                  <StarRating value={review.rating} size="xs" />
                </div>
                <p className="text-xs text-ink-400">{formatRelative(review.createdAt)}</p>
              </div>
              {review.title && <p className="mt-3 text-sm font-semibold text-ink-800">{review.title}</p>}
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{review.body}</p>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={submitReview} className="mt-5 space-y-3 border-t border-border/70 pt-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-ink-700">Your rating</span>
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              className={`min-h-8 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                rating === value
                  ? "border-gold-400 bg-gold-100 text-gold-800"
                  : "border-border text-ink-600 hover:border-gold-300"
              }`}
            >
              {value} star{value === 1 ? "" : "s"}
            </button>
          ))}
        </div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Short headline (optional)"
          className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
        <Textarea
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share your experience with this listing or agent…"
          required
        />
        {submitError && <p className="text-sm text-destructive">{submitError}</p>}
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-ink-500">
            {session?.accessToken ? "Your review will appear immediately after submission." : "Sign in to submit a review."}
          </p>
          {session?.accessToken ? (
            <Button type="submit" disabled={submitting || body.trim().length < 8}>
              {submitting ? "Submitting…" : "Submit Review"}
            </Button>
          ) : (
            <Link href={ROUTES.LOGIN}>
              <Button type="button" variant="outline">Sign In</Button>
            </Link>
          )}
        </div>
      </form>
    </div>
  )
}

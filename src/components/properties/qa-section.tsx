"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { MessageCircleQuestion } from "lucide-react"
import { qaService } from "@/services/qa.service"
import { ApiError } from "@/services/http-client"
import { ROUTES } from "@/config/routes.config"
import { formatRelative } from "@/utils/format-date"
import type { QAItem } from "@/types/qa.types"

export function QASection({
  propertyId,
  embedded = false,
}: {
  propertyId: string
  /** Inside an accordion: no card or heading of its own (the section supplies them). */
  embedded?: boolean
}) {
  const { data: session } = useSession()
  const [question, setQuestion] = useState("")
  const [items, setItems] = useState<QAItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await qaService.list(propertyId)
        setItems(res.data)
      } catch {
        // A failed lookup reads as "no questions yet" instead of an unhandled rejection.
        setItems([])
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [propertyId])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!question.trim()) return

    if (!session?.accessToken) {
      setSubmitError("Please sign in first to ask a question.")
      return
    }

    setSubmitting(true)
    setSubmitError(null)

    try {
      const item = await qaService.ask({ propertyId, question: question.trim() }, session.accessToken)
      setItems((current) => [item, ...current])
      setQuestion("")
    } catch (error) {
      setSubmitError(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Could not submit your question right now.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={embedded ? undefined : "surface-card p-5"}>
      {!embedded && (
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <MessageCircleQuestion className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-h3">Questions & Answers</h3>
            <p className="text-xs text-ink-500">Ask the seller anything about this listing</p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {loading && (
          <div className="rounded-[1rem] border border-dashed border-border/60 p-6 text-sm text-ink-500">
            Loading questions…
          </div>
        )}
        {!loading && items.length === 0 && (
          <div className="rounded-[1rem] border border-dashed border-border/60 p-6 text-center text-sm text-ink-500">
            No questions yet.
          </div>
        )}
        {!loading && items.map((item) => (
          <div key={item.id} className="rounded-[1rem] border border-border bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-ink-900">{item.author?.name ?? "Buyer"}</p>
              <p className="text-xs text-ink-400">{formatRelative(item.createdAt)}</p>
            </div>
            <p className="mt-2 text-sm text-ink-700">{item.question}</p>
            {item.answer ? (
              <div className="mt-3 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-900">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">Seller answer</p>
                <p className="mt-2">{item.answer}</p>
              </div>
            ) : (
              <p className="mt-3 text-xs text-amber-700">Awaiting seller response</p>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question…"
          className="flex-1 rounded-full border border-border bg-white px-4 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-600"
        />
        {session?.accessToken ? (
          <Button type="submit" className="rounded-full bg-brand-700 text-white hover:bg-brand-800" disabled={submitting}>
            {submitting ? "Sending…" : "Ask"}
          </Button>
        ) : (
          <Link href={ROUTES.LOGIN}>
            <Button type="button" variant="outline" className="rounded-full">Sign In</Button>
          </Link>
        )}
      </form>
      {submitError && <p className="mt-2 text-xs text-destructive">{submitError}</p>}
    </div>
  )
}

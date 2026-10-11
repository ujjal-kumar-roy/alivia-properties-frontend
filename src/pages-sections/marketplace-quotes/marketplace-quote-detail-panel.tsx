"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  Mail,
  MessageSquareReply,
  Phone,
} from "lucide-react"

import { MobileActionBar } from "@/components/common/mobile-action-bar"
import { DetailBack, DetailHero, DetailText, Fact, FactGrid } from "@/components/dashboard/detail"
import { QuoteStatusBadge } from "@/components/dashboard/quote-status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ROUTES } from "@/config/routes.config"
import { ApiError } from "@/services/http-client"
import { quotesService } from "@/services/quotes.service"
import type { QuoteRequest, QuoteStatus } from "@/types/quote.types"
import { formatDateTime } from "@/utils/format-date"

const STATUS_OPTIONS: { value: QuoteStatus; label: string }[] = [
  { value: "NEW", label: "New" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "NEGOTIATING", label: "Negotiating" },
  { value: "QUOTE_SENT", label: "Quote sent" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
  { value: "CLOSED", label: "Closed" },
]

type MarketplaceQuoteDetailPanelProps = {
  quote: QuoteRequest
  token?: string
  role: "admin" | "seller" | "buyer"
  backHref: string
}

function quoteSubject(quote: QuoteRequest) {
  return quote.variantName ?? quote.product?.name ?? quote.supplier?.name ?? quote.categorySlug ?? "Marketplace quote"
}

function formatMoney(value?: number | null) {
  if (value == null) return "-"
  return `BDT ${value.toLocaleString("en-BD")}`
}

function relatedHref(quote: QuoteRequest) {
  if (quote.product) return ROUTES.MARKETPLACE_PRODUCT(quote.product.slug)
  if (quote.supplier) return ROUTES.MARKETPLACE_SUPPLIER(quote.supplier.slug)
  if (quote.categorySlug) return ROUTES.MARKETPLACE_CATEGORY(quote.categorySlug)
  return ROUTES.MARKETPLACE
}

export function MarketplaceQuoteDetailPanel({
  quote,
  token,
  role,
  backHref,
}: MarketplaceQuoteDetailPanelProps) {
  const router = useRouter()
  const [current, setCurrent] = useState(quote)
  const [status, setStatus] = useState<QuoteStatus>(quote.status)
  const [reply, setReply] = useState(quote.reply ?? "")
  const [note, setNote] = useState("")
  const [finalPrice, setFinalPrice] = useState(quote.finalQuotedPrice == null ? "" : String(quote.finalQuotedPrice))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const canManage = role === "admin" || role === "seller"

  async function save() {
    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      const updated = await quotesService.update(
        current.id,
        canManage
          ? {
              status,
              finalQuotedPrice: finalPrice ? Number(finalPrice) : undefined,
              reply: reply.trim() !== (current.reply ?? "").trim() ? reply.trim() : undefined,
              note: note.trim() || undefined,
            }
          : { note: note.trim() },
        token,
      )
      setCurrent({
        ...current,
        ...updated,
        supplier: updated.supplier ?? current.supplier,
        product: updated.product ?? current.product,
        buyer: updated.buyer ?? current.buyer,
      })
      setStatus(updated.status)
      setReply(updated.reply ?? reply)
      setNote("")
      setFinalPrice(updated.finalQuotedPrice == null ? "" : String(updated.finalQuotedPrice))
      setSaved(true)
      router.refresh()
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not update this quote request.",
      )
    } finally {
      setSaving(false)
    }
  }

  const noteTooShort = note.trim().length < 2

  return (
    <div className="space-y-3 sm:space-y-5">
      <DetailBack href={backHref}>Back to quotes</DetailBack>

      <div className="grid grid-cols-1 gap-3 sm:gap-5 xl:grid-cols-[1fr_360px]">
        <section className="surface-card overflow-hidden">
          <DetailHero
            kicker="Marketplace quote"
            badge={<QuoteStatusBadge status={current.status} />}
            title={quoteSubject(current)}
            meta={`Submitted ${formatDateTime(current.createdAt)}`}
          />

          <div className="space-y-3 p-3 sm:space-y-5 sm:p-5">
            <FactGrid>
              <Fact label="Customer">
                {current.name}
                {current.company ? (
                  <span className="mt-0.5 block truncate text-xs font-normal text-ink-500">
                    {current.company}
                  </span>
                ) : null}
              </Fact>
              <Fact label="Phone" icon={Phone} href={`tel:${current.phone}`}>
                {current.phone}
              </Fact>
              <Fact label="Email" icon={Mail} href={`mailto:${current.email}`} wide>
                {current.email}
              </Fact>
            </FactGrid>

            <FactGrid className="sm:grid-cols-4">
              <Fact label="Final quote">{formatMoney(current.finalQuotedPrice)}</Fact>
              <Fact label="Quantity">
                {current.quantity ? `${current.quantity} ${current.unit ?? "units"}` : "-"}
              </Fact>
              <Fact label="Location">{current.deliveryLocation ?? current.city ?? "-"}</Fact>
              <Fact label="Delivery">
                {current.deliveryDate ? formatDateTime(current.deliveryDate) : "-"}
              </Fact>
            </FactGrid>

            {(current.variantName || (current.specs?.length ?? 0) > 0) ? (
              <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4 sm:p-5">
                <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-brand-700 sm:text-xs sm:tracking-[0.14em]">
                  Selected variant
                </p>
                {current.variantName ? (
                  <p className="mt-2 font-semibold text-ink-900">{current.variantName}</p>
                ) : null}
                {current.specs?.length ? (
                  <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
                    {current.specs.map((spec) => (
                      <div key={spec.key} className="flex items-baseline justify-between gap-2 text-sm">
                        <dt className="text-ink-500">{spec.label}</dt>
                        <dd className="font-medium text-ink-900">
                          {spec.value}
                          {spec.unit ? ` ${spec.unit}` : ""}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : current.variantLabel ? (
                  <p className="mt-1 text-sm text-ink-600">{current.variantLabel}</p>
                ) : null}
              </div>
            ) : null}

            <DetailText label="Requirement">{current.message}</DetailText>

            {current.reply ? (
              <DetailText
                label="Latest reply"
                tone="success"
                icon={MessageSquareReply}
                footer={
                  current.repliedAt ? (
                    <p className="mt-3 text-xs text-emerald-700">
                      Sent {formatDateTime(current.repliedAt)}
                    </p>
                  ) : null
                }
              >
                {current.reply}
              </DetailText>
            ) : null}

            {current.conversation && current.conversation.length > 0 ? (
              <div className="rounded-2xl border border-border bg-white p-4 sm:p-5">
                <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-500 sm:text-xs sm:tracking-[0.14em]">
                  Conversation thread
                </p>
                <div className="mt-3 space-y-2.5 sm:mt-4 sm:space-y-3">
                  {current.conversation.map((entry) => (
                    <div key={entry.id} className="rounded-xl border border-border/70 bg-ink-50/50 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-ink-600 sm:text-xs sm:tracking-[0.12em]">
                          {entry.authorRole} / {entry.channel}
                        </p>
                        <p className="text-xs text-ink-500">{formatDateTime(entry.createdAt)}</p>
                      </div>
                      <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-ink-800 sm:mt-2">
                        {entry.body}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <aside className="flex flex-col gap-3 sm:gap-5">
          <div className="surface-card order-2 p-4 sm:p-5 xl:order-1">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-brand-700 sm:text-xs">
              Routed to
            </p>
            <h2 className="mt-1.5 text-base font-semibold text-ink-900 sm:mt-2 sm:text-lg">{quoteSubject(current)}</h2>
            <p className="mt-1 text-sm text-ink-500 sm:mt-2">
              {current.supplier?.name ?? "Marketplace team"}
            </p>
            <Button
              variant="outline"
              className="mt-3 w-full rounded-full max-sm:h-10 sm:mt-4"
              render={<Link href={relatedHref(current)} />}
            >
              <ExternalLink className="size-4" />
              Open related page
            </Button>
          </div>

          {canManage ? (
            <div className="surface-card order-1 p-4 sm:p-5 xl:order-2">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-brand-700 sm:text-xs">
                Response
              </p>

              <label className="mt-3 block text-sm font-medium text-ink-800 sm:mt-4" htmlFor="quote-status">
                Status
              </label>
              <select
                id="quote-status"
                value={status}
                onChange={(event) => setStatus(event.target.value as QuoteStatus)}
                className="mt-2 h-10 w-full rounded-lg border border-border bg-white px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <label className="mt-3 block text-sm font-medium text-ink-800 sm:mt-4" htmlFor="quote-final-price">
                Final quoted price
              </label>
              <Input
                id="quote-final-price"
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                value={finalPrice}
                onChange={(event) => setFinalPrice(event.target.value)}
                placeholder="BDT"
                className="mt-2"
              />

              <label className="mt-3 block text-sm font-medium text-ink-800 sm:mt-4" htmlFor="quote-reply">
                Reply
              </label>
              <Textarea
                id="quote-reply"
                rows={7}
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                placeholder="Write the supplier response the buyer will see..."
                className="mt-2"
              />

              <label className="mt-3 block text-sm font-medium text-ink-800 sm:mt-4" htmlFor="quote-note">
                Conversation note
              </label>
              <Textarea
                id="quote-note"
                rows={4}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Add a call note or negotiation update..."
                className="mt-2"
              />

              {error ? (
                <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              ) : null}
              {saved ? (
                <p role="status" className="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-700">
                  <CheckCircle2 className="size-4" />
                  Quote updated
                </p>
              ) : null}

              <Button
                type="button"
                onClick={save}
                disabled={saving}
                className="mt-4 hidden w-full rounded-full bg-brand-700 text-white hover:bg-brand-800 md:inline-flex"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : <MessageSquareReply className="size-4" />}
                Save response
              </Button>
            </div>
          ) : (
            <div className="surface-card order-1 p-4 sm:p-5 xl:order-2">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-brand-700 sm:text-xs">
                Message sales
              </p>
              <Textarea
                rows={5}
                aria-label="Message to the sales team"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Add a message or clarification for the sales team..."
                className="mt-3 sm:mt-4"
              />
              {error ? (
                <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              ) : null}
              {saved ? (
                <p role="status" className="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-700">
                  <CheckCircle2 className="size-4" />
                  Message added
                </p>
              ) : null}
              <Button
                type="button"
                onClick={save}
                disabled={saving || noteTooShort}
                className="mt-4 hidden w-full rounded-full bg-brand-700 text-white hover:bg-brand-800 md:inline-flex"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : <MessageSquareReply className="size-4" />}
                Add message
              </Button>
            </div>
          )}
        </aside>
      </div>

      <MobileActionBar label={canManage ? "Save response" : "Add message"}>
        <button
          type="button"
          className="btn-tactile btn-tactile--block flex-1"
          disabled={saving || (!canManage && noteTooShort)}
          onClick={save}
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <MessageSquareReply className="size-4" />}
          {canManage ? "Save response" : "Add message"}
        </button>
      </MobileActionBar>
    </div>
  )
}

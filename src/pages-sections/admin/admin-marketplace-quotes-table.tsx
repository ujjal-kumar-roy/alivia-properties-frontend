"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { AlertCircle, CheckCircle2, Eye, Loader2, Mail, MessageSquareReply, Phone } from "lucide-react"

import { DataTable, type DataTableColumn } from "@/components/dashboard/data-table"
import { FilterBar } from "@/components/dashboard/filter-bar"
import { RowActions, type RowAction } from "@/components/dashboard/row-actions"
import { QuoteStatusBadge } from "@/components/dashboard/quote-status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { ROUTES } from "@/config/routes.config"
import { useUrlFilter } from "@/hooks/use-url-filter"
import { ApiError } from "@/services/http-client"
import { quotesService } from "@/services/quotes.service"
import type { QuoteRequest, QuoteStatus } from "@/types/quote.types"
import type { User } from "@/types/user.types"
import { formatDate } from "@/utils/format-date"

/** Low-priority table columns: shown from xl, where the sidebar layout has room for them. */
const FROM_XL = "hidden xl:table-cell"

const STATUS_FILTERS: { value: QuoteStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "NEW", label: "New" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "NEGOTIATING", label: "Negotiating" },
  { value: "QUOTE_SENT", label: "Quote sent" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
  { value: "CLOSED", label: "Closed" },
]

function formatMoney(value?: number | null) {
  if (value == null) return "-"
  return `BDT ${value.toLocaleString("en-BD")}`
}

export function AdminMarketplaceQuotesTable({
  quotes,
  detailBasePath = ROUTES.ADMIN_MARKETPLACE_QUOTES,
  salesReps = [],
  status = "all",
}: {
  quotes: QuoteRequest[]
  detailBasePath?: string
  salesReps?: User[]
  status?: QuoteStatus | "all"
}) {
  const { data: session } = useSession()
  const setFilter = useUrlFilter()
  const [rows, setRows] = useState(quotes)
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null)
  const [draftStatus, setDraftStatus] = useState<QuoteStatus>("NEW")
  const [draftAssignedTo, setDraftAssignedTo] = useState("")
  const [draftFinalPrice, setDraftFinalPrice] = useState("")
  const [draftReply, setDraftReply] = useState("")
  const [draftNote, setDraftNote] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const selectedQuote = useMemo(
    () => rows.find((quote) => quote.id === selectedQuoteId) ?? null,
    [rows, selectedQuoteId],
  )

  function openReview(quote: QuoteRequest) {
    setSelectedQuoteId(quote.id)
    setDraftStatus(quote.status)
    setDraftAssignedTo(quote.assignedTo ?? "")
    setDraftFinalPrice(quote.finalQuotedPrice == null ? "" : String(quote.finalQuotedPrice))
    setDraftReply(quote.reply ?? "")
    setDraftNote("")
    setSaveError(null)
    setSaveSuccess(false)
  }

  function closeReview(open: boolean) {
    if (open) return
    if (saving) return
    setSelectedQuoteId(null)
    setSaveError(null)
    setSaveSuccess(false)
  }

  async function saveQuoteUpdate() {
    if (!selectedQuote) return

    const reply = draftReply.trim()
    if (draftStatus === "QUOTE_SENT" && reply.length < 2) {
      setSaveError("Write a reply before marking this quote as quote sent.")
      return
    }

    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    try {
      const updated = await quotesService.update(
        selectedQuote.id,
        {
          status: draftStatus,
          assignedTo: draftAssignedTo || undefined,
          finalQuotedPrice: draftFinalPrice ? Number(draftFinalPrice) : undefined,
          reply: reply || undefined,
          note: draftNote.trim() || undefined,
        },
        session?.accessToken,
      )

      setRows((current) =>
        current.map((quote) =>
          quote.id === selectedQuote.id
            ? {
                ...quote,
                ...updated,
                supplier: updated.supplier ?? quote.supplier,
                product: updated.product ?? quote.product,
                buyer: updated.buyer ?? quote.buyer,
              }
            : quote,
        ),
      )
      setSaveSuccess(true)
      window.setTimeout(() => {
        setSelectedQuoteId(null)
        setSaveSuccess(false)
      }, 700)
    } catch (err) {
      setSaveError(
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

  const columns: DataTableColumn<QuoteRequest>[] = [
    {
      key: "customer",
      header: "Customer",
      primaryOnMobile: true,
      render: (quote) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink-900">{quote.name}</p>
          <p className="mt-0.5 truncate text-xs text-ink-500">{quote.email}</p>
        </div>
      ),
    },
    {
      key: "request",
      header: "Request",
      mobileLabel: false,
      wideOnMobile: true,
      render: (quote) => (
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-ink-800">
            {quote.product?.name ?? quote.supplier?.name ?? quote.categorySlug ?? "General quote"}
          </p>
          <p className="mt-0.5 line-clamp-2 max-w-[22rem] text-xs text-ink-500 max-sm:max-w-none">
            {quote.message}
          </p>
        </div>
      ),
    },
    {
      key: "supplier",
      header: "Supplier",
      className: FROM_XL,
      hideOnMobile: true,
      render: (quote) =>
        quote.supplier ? (
          <Link
            href={ROUTES.MARKETPLACE_SUPPLIER(quote.supplier.slug)}
            className="text-xs font-medium text-brand-700 hover:text-brand-800"
          >
            {quote.supplier.name}
          </Link>
        ) : (
          <span className="text-xs text-ink-500">Manual routing</span>
        ),
    },
    {
      key: "quantity",
      header: "Quantity",
      className: FROM_XL,
      hideOnMobile: true,
      render: (quote) => (
        <div className="text-xs text-ink-700">
          <p className="font-medium">{formatMoney(quote.finalQuotedPrice)}</p>
          {quote.quantity ? (
            <p className="mt-0.5 text-ink-500">
              {quote.quantity} {quote.unit ?? "units"}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      badgeOnMobile: true,
      render: (quote) => (
        <div className="space-y-1 max-sm:flex max-sm:flex-col max-sm:items-end">
          <QuoteStatusBadge status={quote.status} />
          <p className="text-[0.6875rem] text-ink-500">
            {quote.assignedRep?.name ?? "Unassigned"}
          </p>
        </div>
      ),
    },
    {
      key: "created",
      header: "Submitted",
      className: FROM_XL,
      mobileLabel: false,
      render: (quote) => (
        <span className="text-xs text-ink-500">{formatDate(quote.createdAt)}</span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (quote) => {
        const actions: RowAction[] = [
          {
            key: "review",
            label: "Review",
            icon: MessageSquareReply,
            primary: true,
            solid: true,
            onSelect: () => openReview(quote),
          },
          {
            key: "detail",
            label: "Open quote detail",
            icon: Eye,
            href: `${detailBasePath}/${quote.id}`,
          },
          {
            key: "email",
            label: "Email customer",
            icon: Mail,
            href: `mailto:${quote.email}`,
          },
          {
            key: "call",
            label: "Call customer",
            icon: Phone,
            href: `tel:${quote.phone}`,
          },
        ]
        return <RowActions actions={actions} menuLabel={`Actions for ${quote.name}`} />
      },
    },
  ]

  return (
    <div className="space-y-3 sm:space-y-4">
      <FilterBar
        groups={[{ name: "status", label: "Status", value: status, options: STATUS_FILTERS }]}
        onChange={setFilter}
      />
      <DataTable
        columns={columns}
        data={rows}
        rowKey={(quote) => quote.id}
        emptyMessage="No marketplace quote requests match this filter."
      />

      <Dialog open={Boolean(selectedQuote)} onOpenChange={closeReview}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          {selectedQuote ? (
            <>
              <DialogHeader>
                <DialogTitle>Review quote request</DialogTitle>
                <DialogDescription>
                  Reply to the customer and keep the request status current.
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 gap-4">
                <section className="rounded-lg border border-border/70 bg-ink-50/40 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink-900">{selectedQuote.name}</p>
                      <p className="mt-0.5 text-xs text-ink-500">
                        {selectedQuote.email} · {selectedQuote.phone}
                      </p>
                    </div>
                    <QuoteStatusBadge status={selectedQuote.status} />
                  </div>
                  <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
                    <div>
                      <dt className="font-semibold uppercase tracking-[0.14em] text-ink-500">Request</dt>
                      <dd className="mt-1 text-ink-800">
                        {selectedQuote.product?.name ??
                          selectedQuote.supplier?.name ??
                          selectedQuote.categorySlug ??
                          "General quote"}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold uppercase tracking-[0.14em] text-ink-500">Final quote</dt>
                      <dd className="mt-1 text-ink-800">{formatMoney(selectedQuote.finalQuotedPrice)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold uppercase tracking-[0.14em] text-ink-500">Submitted</dt>
                      <dd className="mt-1 text-ink-800">{formatDate(selectedQuote.createdAt)}</dd>
                    </div>
                  </dl>
                </section>

                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">
                    Requirement
                  </h3>
                  <p className="rounded-lg border border-border/70 bg-white p-3 text-sm leading-6 text-ink-700">
                    {selectedQuote.message}
                  </p>
                </section>

                <section className="grid grid-cols-1 gap-3">
                  <label htmlFor="quote-status" className="text-sm font-medium text-ink-800">
                    Status
                  </label>
                  <select
                    id="quote-status"
                    value={draftStatus}
                    onChange={(event) => setDraftStatus(event.target.value as QuoteStatus)}
                    disabled={saving}
                    className="h-9 rounded-lg border border-border bg-white px-3 text-sm text-ink-900 outline-none transition-colors focus:border-brand-600 focus:ring-3 focus:ring-brand-600/20 disabled:opacity-60"
                  >
                    <option value="NEW">New</option>
                    <option value="ASSIGNED">Assigned</option>
                    <option value="CONTACTED">Contacted</option>
                    <option value="NEGOTIATING">Negotiating</option>
                    <option value="QUOTE_SENT">Quote sent</option>
                    <option value="WON">Won</option>
                    <option value="LOST">Lost</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </section>

                {salesReps.length > 0 ? (
                  <section className="grid grid-cols-1 gap-3">
                    <label htmlFor="quote-assignee" className="text-sm font-medium text-ink-800">
                      Assigned rep
                    </label>
                    <select
                      id="quote-assignee"
                      value={draftAssignedTo}
                      onChange={(event) => setDraftAssignedTo(event.target.value)}
                      disabled={saving}
                      className="h-9 rounded-lg border border-border bg-white px-3 text-sm text-ink-900 outline-none transition-colors focus:border-brand-600 focus:ring-3 focus:ring-brand-600/20 disabled:opacity-60"
                    >
                      <option value="">Unassigned</option>
                      {salesReps.map((rep) => (
                        <option key={rep.id} value={rep.id}>
                          {rep.name} ({rep.email})
                        </option>
                      ))}
                    </select>
                  </section>
                ) : null}

                {salesReps.length === 0 && selectedQuote.assignedTo == null && session?.user?.id ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving}
                    onClick={() => {
                      setDraftAssignedTo(session.user.id)
                      setDraftStatus("ASSIGNED")
                    }}
                  >
                    Claim to me
                  </Button>
                ) : null}

                <section className="grid grid-cols-1 gap-3">
                  <label htmlFor="quote-final-price" className="text-sm font-medium text-ink-800">
                    Final quoted price
                  </label>
                  <Input
                    id="quote-final-price"
                    type="number"
                    min={0}
                    step="any"
                    value={draftFinalPrice}
                    onChange={(event) => setDraftFinalPrice(event.target.value)}
                    disabled={saving}
                    placeholder="BDT"
                  />
                </section>

                <section className="grid grid-cols-1 gap-3">
                  <label htmlFor="quote-reply" className="text-sm font-medium text-ink-800">
                    Reply
                  </label>
                  <Textarea
                    id="quote-reply"
                    rows={7}
                    value={draftReply}
                    onChange={(event) => setDraftReply(event.target.value)}
                    disabled={saving}
                    maxLength={4000}
                    placeholder="Write the supplier/admin response the buyer will see in their dashboard."
                    className="resize-y bg-white text-sm"
                  />
                  <div className="flex items-center justify-between gap-3 text-xs text-ink-500">
                    <span>{draftReply.trim().length > 0 ? "Visible in the buyer quote panel." : "No reply yet."}</span>
                    <span>{draftReply.length}/4000</span>
                  </div>
                </section>

                <section className="grid grid-cols-1 gap-3">
                  <label htmlFor="quote-note" className="text-sm font-medium text-ink-800">
                    Conversation note
                  </label>
                  <Textarea
                    id="quote-note"
                    rows={4}
                    value={draftNote}
                    onChange={(event) => setDraftNote(event.target.value)}
                    disabled={saving}
                    maxLength={4000}
                    placeholder="Add call note, manual follow-up, or internal context."
                    className="resize-y bg-white text-sm"
                  />
                </section>

                {saveError ? (
                  <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    <span>{saveError}</span>
                  </div>
                ) : null}

                {saveSuccess ? (
                  <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                    <span>Quote request updated.</span>
                  </div>
                ) : null}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={() => closeReview(false)}
                >
                  Cancel
                </Button>
                <Button type="button" disabled={saving} onClick={saveQuoteUpdate}>
                  {saving ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Saving
                    </>
                  ) : (
                    <>
                      <MessageSquareReply className="size-4" />
                      Save reply
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

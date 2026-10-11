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
import { InquiryStatusBadge } from "@/components/dashboard/inquiry-status-badge"
import { DetailBack, DetailHero, DetailText, Fact, FactGrid } from "@/components/dashboard/detail"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ROUTES } from "@/config/routes.config"
import { inquiriesService } from "@/services/inquiries.service"
import { ApiError } from "@/services/http-client"
import { formatDateTime } from "@/utils/format-date"
import type { Inquiry, InquiryStatus } from "@/types/inquiry.types"

const STATUS_OPTIONS: { value: InquiryStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "read", label: "Read" },
  { value: "replied", label: "Replied" },
  { value: "closed", label: "Closed" },
]

type InquiryDetailPanelProps = {
  inquiry: Inquiry
  token?: string
  role: "admin" | "seller" | "buyer"
  backHref: string
}

function subjectFor(inquiry: Inquiry) {
  return inquiry.propertyTitle ?? inquiry.projectName ?? "General inquiry"
}

function relatedHref(inquiry: Inquiry) {
  if (inquiry.propertySlug) return ROUTES.PROPERTY_DETAIL(inquiry.propertySlug)
  if (inquiry.projectSlug) return ROUTES.PROJECT_DETAIL(inquiry.projectSlug)
  return null
}

export function InquiryDetailPanel({
  inquiry,
  token,
  role,
  backHref,
}: InquiryDetailPanelProps) {
  const router = useRouter()
  const [current, setCurrent] = useState(inquiry)
  const [status, setStatus] = useState<InquiryStatus>(inquiry.status)
  const [reply, setReply] = useState(inquiry.reply ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const canManage = role === "admin" || role === "seller"
  const related = relatedHref(current)

  async function save() {
    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      const updated = await inquiriesService.update(
        current.id,
        {
          status,
          reply: reply.trim() !== (current.reply ?? "").trim() ? reply.trim() : undefined,
        },
        token,
      )
      setCurrent(updated)
      setStatus(updated.status)
      setReply(updated.reply ?? reply)
      setSaved(true)
      router.refresh()
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not update this inquiry.",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3 sm:space-y-5">
      <DetailBack href={backHref}>Back to inquiries</DetailBack>

      <div className="grid grid-cols-1 gap-3 sm:gap-5 xl:grid-cols-[1fr_360px]">
        <section className="surface-card overflow-hidden">
          <DetailHero
            kicker={`${current.type} inquiry`}
            badge={<InquiryStatusBadge status={current.status} />}
            title={subjectFor(current)}
            meta={`Received ${formatDateTime(current.createdAt)}`}
          />

          <div className="space-y-3 p-3 sm:space-y-5 sm:p-5">
            <FactGrid>
              <Fact label="From">{current.name}</Fact>
              <Fact label="Phone" icon={Phone} href={`tel:${current.phone}`}>
                {current.phone}
              </Fact>
              <Fact label="Email" icon={Mail} href={`mailto:${current.email}`} wide>
                {current.email}
              </Fact>
            </FactGrid>

            <DetailText label="Message">{current.message}</DetailText>

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
          </div>
        </section>

        <aside className="flex flex-col gap-3 sm:gap-5">
          <div className="surface-card order-2 p-4 sm:p-5 xl:order-1">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-brand-700 sm:text-xs">
              Related record
            </p>
            <h2 className="mt-1.5 text-base font-semibold text-ink-900 sm:mt-2 sm:text-lg">{subjectFor(current)}</h2>
            <p className="mt-1 text-sm capitalize text-ink-500 sm:mt-2">{current.type}</p>
            {related ? (
              <Button
                variant="outline"
                className="mt-3 w-full rounded-full max-sm:h-10 sm:mt-4"
                render={<Link href={related} />}
              >
                <ExternalLink className="size-4" />
                Open related page
              </Button>
            ) : null}
          </div>

          {canManage ? (
            <div className="surface-card order-1 p-4 sm:p-5 xl:order-2">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-brand-700 sm:text-xs">
                Seller action
              </p>

              <label className="mt-3 block text-sm font-medium text-ink-800 sm:mt-4" htmlFor="inquiry-status">
                Status
              </label>
              <select
                id="inquiry-status"
                value={status}
                onChange={(event) => setStatus(event.target.value as InquiryStatus)}
                className="mt-2 h-10 w-full rounded-lg border border-border bg-white px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <label className="mt-3 block text-sm font-medium text-ink-800 sm:mt-4" htmlFor="inquiry-reply">
                Reply note
              </label>
              <Textarea
                id="inquiry-reply"
                rows={7}
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                placeholder="Write the seller reply or internal follow-up note..."
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
                  Inquiry updated
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
          ) : null}
        </aside>
      </div>

      {canManage ? (
        <MobileActionBar label="Save response">
          <button type="button" className="btn-tactile btn-tactile--block flex-1" disabled={saving} onClick={save}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <MessageSquareReply className="size-4" />}
            Save response
          </button>
        </MobileActionBar>
      ) : null}
    </div>
  )
}

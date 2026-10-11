"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import {
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Mail,
  Phone,
  XCircle,
} from "lucide-react"

import { MobileActionBar } from "@/components/common/mobile-action-bar"
import { BookingStatusBadge } from "@/components/dashboard/booking-status-badge"
import { DetailBack, DetailHero, DetailText, Fact, FactGrid } from "@/components/dashboard/detail"
import { Button } from "@/components/ui/button"
import { ROUTES } from "@/config/routes.config"
import { ApiError } from "@/services/http-client"
import { bookingsService } from "@/services/bookings.service"
import type { Booking, BookingStatus } from "@/types/booking.types"
import { formatDate, formatDateTime } from "@/utils/format-date"

type BookingDetailPanelProps = {
  booking: Booking
  token?: string
  backHref: string
}

type BookingAction = "confirm" | "cancel" | "complete"

function consultationLabel(type: Booking["consultationType"]) {
  return type.replace(/-/g, " ")
}

function relatedTitle(booking: Booking) {
  return booking.propertyTitle ?? booking.projectName ?? "General consultation"
}

function relatedHref(booking: Booking) {
  if (booking.propertySlug) return ROUTES.PROPERTY_DETAIL(booking.propertySlug)
  if (booking.projectSlug) return ROUTES.PROJECT_DETAIL(booking.projectSlug)
  return null
}

export function BookingDetailPanel({ booking, token, backHref }: BookingDetailPanelProps) {
  const router = useRouter()
  const [current, setCurrent] = useState(booking)
  const [savingAction, setSavingAction] = useState<BookingAction | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  // When the last action finished. The floating bar's primary button turns into the NEXT action
  // ("Confirm" becomes "Mark completed") in the same spot, so a double-tap must not run both.
  const lastActionDoneAt = useRef(0)
  const related = relatedHref(current)

  async function runAction(action: BookingAction) {
    setSavingAction(action)
    setError(null)
    setSaved(null)

    try {
      const updated =
        action === "confirm"
          ? await bookingsService.confirm(current.id, token)
          : action === "cancel"
            ? await bookingsService.cancel(current.id, token)
            : await bookingsService.complete(current.id, token)

      setCurrent({
        ...current,
        ...updated,
        propertyTitle: updated.propertyTitle ?? current.propertyTitle,
        propertySlug: updated.propertySlug ?? current.propertySlug,
        projectName: updated.projectName ?? current.projectName,
        projectSlug: updated.projectSlug ?? current.projectSlug,
      })
      setSaved(`Booking ${action === "complete" ? "completed" : `${action}ed`}.`)
      router.refresh()
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not update this booking.",
      )
    } finally {
      setSavingAction(null)
      lastActionDoneAt.current = Date.now()
    }
  }

  /** Floating-bar taps: ignore one that lands within 700ms of the previous action finishing. */
  function runFromBar(action: BookingAction) {
    if (Date.now() - lastActionDoneAt.current < 700) return
    void runAction(action)
  }

  function canMoveTo(status: BookingStatus) {
    if (current.status === "cancelled" || current.status === "completed") return false
    return current.status !== status
  }

  const canConfirm = canMoveTo("confirmed")
  const canComplete = canMoveTo("completed") && current.status === "confirmed"
  const canCancel = canMoveTo("cancelled")
  // On phones the one next step lives in the floating action bar.
  const nextAction: BookingAction | null = canConfirm ? "confirm" : canComplete ? "complete" : null
  const showBar = nextAction !== null || canCancel

  return (
    <div className="space-y-3 sm:space-y-5">
      <DetailBack href={backHref}>Back to bookings</DetailBack>

      {/* Phones: outcome of the last action (the actions card is replaced by the bar) */}
      {saved ? (
        <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 md:hidden">
          {saved}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 md:hidden">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:gap-5 xl:grid-cols-[1fr_360px]">
        <section className="surface-card overflow-hidden">
          <DetailHero
            kicker={`${consultationLabel(current.consultationType)} booking`}
            badge={<BookingStatusBadge status={current.status} />}
            title={relatedTitle(current)}
            meta={`Submitted ${formatDateTime(current.createdAt)}`}
          />

          <div className="space-y-3 p-3 sm:space-y-5 sm:p-5">
            <FactGrid>
              <Fact label="Client">{current.name}</Fact>
              <Fact label="Phone" icon={Phone} href={`tel:${current.phone}`}>
                {current.phone}
              </Fact>
              <Fact label="Email" icon={Mail} href={`mailto:${current.email}`} wide>
                {current.email}
              </Fact>
            </FactGrid>

            <FactGrid>
              <Fact label="Preferred date" icon={CalendarDays}>
                {formatDate(current.preferredDate)}
              </Fact>
              <Fact label="Preferred time">{current.preferredTime}</Fact>
              <Fact label="Related record" wide>
                {relatedTitle(current)}
              </Fact>
            </FactGrid>

            <DetailText label="Message">
              {current.message?.trim() || "No message was added for this booking."}
            </DetailText>
          </div>
        </section>

        <aside className="space-y-3 sm:space-y-5">
          <div className="surface-card p-4 sm:p-5">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-brand-700 sm:text-xs">
              Booking lifecycle
            </p>
            <div className="mt-3 space-y-1.5 text-sm text-ink-600 sm:mt-4 sm:space-y-2">
              <p>Created: {formatDateTime(current.createdAt)}</p>
              {current.confirmedAt ? <p>Confirmed: {formatDateTime(current.confirmedAt)}</p> : null}
              {current.cancelledAt ? <p>Cancelled: {formatDateTime(current.cancelledAt)}</p> : null}
              {current.completedAt ? <p>Completed: {formatDateTime(current.completedAt)}</p> : null}
            </div>
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

          {/* md and up: the full actions card. Phones use the floating bar below. */}
          <div className="surface-card hidden p-5 md:block">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
              Admin actions
            </p>
            <div className="mt-4 grid gap-2">
              <Button
                className="rounded-full"
                disabled={!canConfirm || savingAction !== null}
                onClick={() => runAction("confirm")}
              >
                {savingAction === "confirm" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                Confirm booking
              </Button>
              <Button
                variant="outline"
                className="rounded-full"
                disabled={!canComplete || savingAction !== null}
                onClick={() => runAction("complete")}
              >
                {savingAction === "complete" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                Mark completed
              </Button>
              <Button
                variant="outline"
                className="rounded-full border-red-200 text-red-700 hover:bg-red-50"
                disabled={!canCancel || savingAction !== null}
                onClick={() => runAction("cancel")}
              >
                {savingAction === "cancel" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <XCircle className="size-4" />
                )}
                Cancel booking
              </Button>
            </div>

            {saved ? <p className="mt-3 text-sm font-medium text-emerald-700">{saved}</p> : null}
            {error ? <p className="mt-3 text-sm font-medium text-red-600">{error}</p> : null}
          </div>
        </aside>
      </div>

      {showBar ? (
        <MobileActionBar label="Booking actions">
          {nextAction ? (
            <button
              key={nextAction}
              type="button"
              className="btn-tactile flex-1"
              disabled={savingAction !== null}
              onClick={() => runFromBar(nextAction)}
            >
              {savingAction === nextAction ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              {nextAction === "confirm" ? "Confirm booking" : "Mark completed"}
            </button>
          ) : (
            <span key="status" className="flex-1 px-3 text-sm text-ink-600">Confirmed booking</span>
          )}
          {canCancel ? (
            <button
              key="cancel"
              type="button"
              className="btn-glass size-11 shrink-0 !p-0 text-red-700"
              aria-label="Cancel booking"
              disabled={savingAction !== null}
              onClick={() => runFromBar("cancel")}
            >
              {savingAction === "cancel" ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <XCircle className="size-5" />
              )}
            </button>
          ) : null}
        </MobileActionBar>
      ) : null}
    </div>
  )
}

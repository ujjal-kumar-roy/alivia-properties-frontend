"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { AdminFormNotice } from "@/components/common/admin-form-notice"
import { Field, FIELD_CLASS, useInlineValidation } from "@/components/booking/form-fields"
import { FormSuccess } from "@/components/booking/form-success"
import { ROUTES } from "@/config/routes.config"
import { bookingsService } from "@/services/bookings.service"
import { ApiError } from "@/services/http-client"

const CONSULTATION_TYPES = [
  { value: "BUYING", label: "Buying a property" },
  { value: "INVESTMENT", label: "Investment advice" },
  { value: "PROJECT_SPECIFIC", label: "Apartment inquiry" },
  { value: "SITE_VISIT", label: "Site visit request" },
] as const

const TIME_SLOTS = ["10:00 AM", "11:00 AM", "12:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM"]

export function ConsultationForm() {
  const { data: session } = useSession()
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { errors, validate, clear } = useInlineValidation()

  // Admins receive these consultation bookings — they manage them from the
  // dashboard rather than submitting the public form themselves.
  if (session?.user?.role === "admin") {
    return <AdminFormNotice manageHref={ROUTES.ADMIN_BOOKINGS} />
  }

  const invalid = (name: string) => ({
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `consult-${name}-error` : undefined,
  })

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    // Capture the form node synchronously: after the `await` below, React has
    // finished dispatching the event and resets `e.currentTarget` to null.
    const form = e.currentTarget
    if (!validate(form)) return
    setSubmitting(true)
    setSubmitError(null)

    const formData = new FormData(form)

    try {
      await bookingsService.create(
        {
          consultationType: String(formData.get("consultationType")),
          name: String(formData.get("name") ?? "").trim(),
          phone: String(formData.get("phone") ?? "").trim(),
          email: String(formData.get("email") ?? "").trim(),
          preferredDate: String(formData.get("preferredDate") ?? ""),
          preferredTime: String(formData.get("preferredTime") ?? ""),
          message: String(formData.get("message") ?? "").trim() || undefined,
        },
        session?.accessToken,
      )
      setSubmitted(true)
      form.reset()
    } catch (error) {
      setSubmitError(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Could not book the consultation right now.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <FormSuccess title="Booking received">
        Our team will confirm within 2 hours.
      </FormSuccess>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      onInput={(e) => clear((e.target as HTMLInputElement).name)}
      noValidate
      className="space-y-3.5"
    >
      {submitError && (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {submitError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field id="consult-name" label="Full Name *" error={errors.name}>
          <input id="consult-name" name="name" required autoComplete="name" className={FIELD_CLASS} placeholder="Your name" {...invalid("name")} />
        </Field>
        <Field id="consult-phone" label="Phone *" error={errors.phone}>
          <input id="consult-phone" name="phone" required type="tel" autoComplete="tel" className={FIELD_CLASS} placeholder="+8801712345678" {...invalid("phone")} />
        </Field>
      </div>

      <Field id="consult-email" label="Email *" error={errors.email}>
        <input id="consult-email" name="email" required type="email" autoComplete="email" className={FIELD_CLASS} placeholder="you@example.com" {...invalid("email")} />
      </Field>

      <Field id="consult-type" label="Consultation type *" error={errors.consultationType}>
        <select id="consult-type" name="consultationType" required className={FIELD_CLASS} {...invalid("consultationType")}>
          <option value="">Select type…</option>
          {CONSULTATION_TYPES.map((type) => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field id="consult-date" label="Preferred date *" error={errors.preferredDate}>
          <input id="consult-date" name="preferredDate" required type="date" className={FIELD_CLASS} {...invalid("preferredDate")} />
        </Field>
        <Field id="consult-time" label="Preferred time *" error={errors.preferredTime}>
          <select id="consult-time" name="preferredTime" required className={FIELD_CLASS} {...invalid("preferredTime")}>
            <option value="">Select time…</option>
            {TIME_SLOTS.map((slot) => (
              <option key={slot} value={slot}>{slot}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field id="consult-message" label="Message" error={errors.message}>
        <textarea id="consult-message" name="message" rows={3} className={FIELD_CLASS} placeholder="Any specific apartments, areas, or requirements…" {...invalid("message")} />
      </Field>

      <button type="submit" className="btn-tactile btn-tactile--block" disabled={submitting}>
        {submitting ? "Booking…" : "Book Free Consultation"}
      </button>
    </form>
  )
}

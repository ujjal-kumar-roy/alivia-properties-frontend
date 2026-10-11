"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { AdminFormNotice } from "@/components/common/admin-form-notice"
import { Field, FIELD_CLASS, useInlineValidation } from "@/components/booking/form-fields"
import { FormSuccess } from "@/components/booking/form-success"
import { ROUTES } from "@/config/routes.config"
import { inquiriesService } from "@/services/inquiries.service"
import { ApiError } from "@/services/http-client"

export function ContactForm() {
  const { data: session } = useSession()
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { errors, validate, clear } = useInlineValidation()

  // Admins receive these inquiries — they manage them from the dashboard
  // rather than submitting the public form themselves.
  if (session?.user?.role === "admin") {
    return <AdminFormNotice manageHref={ROUTES.ADMIN_INQUIRIES} />
  }

  const invalid = (name: string) => ({
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `contact-${name}-error` : undefined,
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
    const name = String(formData.get("name") ?? "").trim()
    const phone = String(formData.get("phone") ?? "").trim()
    const email = String(formData.get("email") ?? "").trim()
    const subject = String(formData.get("subject") ?? "").trim()
    const message = String(formData.get("message") ?? "").trim()

    try {
      await inquiriesService.create(
        {
          type: "GENERAL",
          name,
          phone,
          email,
          message: subject ? `${subject}\n\n${message}` : message,
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
            : "Could not send your message right now.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <FormSuccess title="Message sent">
        Thank you. We&apos;ll get back to you within 24 hours.
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
        <Field id="contact-name" label="Full Name *" error={errors.name}>
          <input id="contact-name" name="name" required autoComplete="name" className={FIELD_CLASS} placeholder="Your name" {...invalid("name")} />
        </Field>
        <Field id="contact-phone" label="Phone *" error={errors.phone}>
          <input id="contact-phone" name="phone" required type="tel" autoComplete="tel" className={FIELD_CLASS} placeholder="+8801712345678" {...invalid("phone")} />
        </Field>
      </div>

      <Field id="contact-email" label="Email Address *" error={errors.email}>
        <input id="contact-email" name="email" required type="email" autoComplete="email" className={FIELD_CLASS} placeholder="you@example.com" {...invalid("email")} />
      </Field>

      <Field id="contact-subject" label="Subject *" error={errors.subject}>
        <input id="contact-subject" name="subject" required className={FIELD_CLASS} placeholder="How can we help?" {...invalid("subject")} />
      </Field>

      <Field id="contact-message" label="Message *" error={errors.message}>
        <textarea id="contact-message" name="message" required rows={4} className={FIELD_CLASS} placeholder="Tell us more about your inquiry…" {...invalid("message")} />
      </Field>

      <button type="submit" className="btn-tactile btn-tactile--block" disabled={submitting}>
        {submitting ? "Sending…" : "Send Message"}
      </button>
    </form>
  )
}

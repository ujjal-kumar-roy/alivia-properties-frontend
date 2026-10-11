"use client"

import { Loader2, Send } from "lucide-react"
import { useSession } from "next-auth/react"
import { useId, useRef, useState, type FormEvent, type ReactNode } from "react"
import { GlassSheet } from "@/components/common/glass-sheet"
import { GuideAvatar } from "@/components/common/guide-avatar"
import { celebrate, haptic } from "@/lib/celebrate"
import { inquiriesService } from "@/services/inquiries.service"

type ProjectEnquireProps = {
  projectId: string
  projectName: string
  /** Classes for the trigger button (the page picks `btn-tactile` and its width). */
  className?: string
  /** The trigger button's label. */
  children: ReactNode
}

const FIELD_CLASS =
  "w-full rounded-xl border border-border bg-white px-3 py-2.5 text-base text-ink-900 outline-none transition-colors placeholder:text-ink-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25"
const LABEL_CLASS = "mb-1 block text-[0.8125rem] font-semibold text-ink-800"

/**
 * "Enquire" for one apartment project: a button that opens a bottom glass sheet
 * with a four field form (name, phone, email, message). The message arrives
 * pre-written, so a visitor only adds contact details. It posts a PROJECT
 * inquiry through the inquiries service; on success the Alivia guide cheers and
 * one confetti burst fires. Signed-in visitors get their name and email filled.
 */
export function ProjectEnquire({ projectId, projectName, className, children }: ProjectEnquireProps) {
  const { data: session } = useSession()
  const formId = useId()
  const submitRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function openSheet() {
    setSentTo(null)
    setError(null)
    setOpen(true)
    haptic("tap")
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // Read the form before the await: React clears currentTarget afterwards.
    const data = new FormData(event.currentTarget)
    const name = String(data.get("name") ?? "").trim()
    setSending(true)
    setError(null)
    try {
      await inquiriesService.create(
        {
          type: "PROJECT",
          projectId,
          name,
          phone: String(data.get("phone") ?? "").trim(),
          email: String(data.get("email") ?? "").trim(),
          message: String(data.get("message") ?? "").trim(),
        },
        session?.accessToken,
      )
      setSentTo(name.split(/\s+/)[0] || "there")
      celebrate({ origin: submitRef.current })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not send your enquiry right now. Please try again.",
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button type="button" onClick={openSheet} aria-haspopup="dialog" className={className}>
        {children}
      </button>

      <GlassSheet
        open={open}
        onOpenChange={setOpen}
        title={sentTo ? "Enquiry sent" : "Enquire about this apartment"}
        description={sentTo ? undefined : projectName}
        className="md:mx-auto md:max-w-lg"
        footer={
          sentTo ? (
            <button type="button" onClick={() => setOpen(false)} className="btn-glass w-full">
              Done
            </button>
          ) : (
            <button
              ref={submitRef}
              type="submit"
              form={formId}
              disabled={sending}
              className="btn-tactile btn-tactile--block"
            >
              {sending ? (
                <>
                  <Loader2 aria-hidden="true" className="size-4 motion-safe:animate-spin" />
                  Sending
                </>
              ) : (
                <>
                  <Send aria-hidden="true" className="size-4" />
                  Send enquiry
                </>
              )}
            </button>
          )
        }
      >
        {sentTo ? (
          <div role="status" className="flex items-start gap-3 py-2">
            <GuideAvatar mood="cheer" size={52} />
            <div className="speech-bubble min-w-0 flex-1">
              <p className="text-base font-extrabold text-ink-900">Thank you, {sentTo}</p>
              <p className="mt-0.5 text-sm font-medium text-ink-600">
                Your enquiry about {projectName} is with our team. We will call you soon.
              </p>
            </div>
          </div>
        ) : (
          <form id={formId} onSubmit={submit} className="space-y-3 pb-1">
            {error ? (
              <p
                role="alert"
                className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </p>
            ) : null}
            <div>
              <label htmlFor={`${formId}-name`} className={LABEL_CLASS}>
                Your name
              </label>
              <input
                id={`${formId}-name`}
                name="name"
                required
                autoComplete="name"
                defaultValue={session?.user?.name ?? ""}
                placeholder="Full name"
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label htmlFor={`${formId}-phone`} className={LABEL_CLASS}>
                Phone
              </label>
              <input
                id={`${formId}-phone`}
                name="phone"
                type="tel"
                inputMode="tel"
                required
                autoComplete="tel"
                placeholder="01XXXXXXXXX"
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label htmlFor={`${formId}-email`} className={LABEL_CLASS}>
                Email
              </label>
              <input
                id={`${formId}-email`}
                name="email"
                type="email"
                inputMode="email"
                required
                autoComplete="email"
                defaultValue={session?.user?.email ?? ""}
                placeholder="you@example.com"
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label htmlFor={`${formId}-message`} className={LABEL_CLASS}>
                Message
              </label>
              <textarea
                id={`${formId}-message`}
                name="message"
                required
                rows={3}
                defaultValue={`I am interested in ${projectName}. Please share pricing and availability.`}
                className={`${FIELD_CLASS} resize-none`}
              />
            </div>
            <p className="text-xs text-ink-500">
              Your details are only used to reply about this apartment.
            </p>
          </form>
        )}
      </GlassSheet>
    </>
  )
}

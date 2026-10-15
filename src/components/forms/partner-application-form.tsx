"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { AlertCircle, Loader2, SendHorizontal } from "lucide-react"

import { FormSuccess } from "@/components/booking/form-success"
import { MobileActionBar } from "@/components/common/mobile-action-bar"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { inquiriesService } from "@/services/inquiries.service"
import { ApiError } from "@/services/http-client"
import {
  partnerApplicationSchema,
  type PartnerApplicationInput,
} from "@/schemas/partner.schema"

type PartnerType = "supplier" | "investor"

const COPY: Record<
  PartnerType,
  { purposeLabel: string; purposePlaceholder: string; detailsLabel: string; detailsPlaceholder: string }
> = {
  supplier: {
    purposeLabel: "What do you want to supply",
    purposePlaceholder: "e.g. Cement, tiles, steel, electrical fittings, services…",
    detailsLabel: "Details of your supply offering",
    detailsPlaceholder:
      "Tell us about your products / services, brands, monthly capacity, delivery areas, and any certifications.",
  },
  investor: {
    purposeLabel: "Purpose of investment",
    purposePlaceholder: "e.g. Apartment building, land, commercial space…",
    detailsLabel: "Details of your investment interest",
    detailsPlaceholder:
      "Tell us about your budget range, preferred locations, expected timeline, and what you're looking for.",
  },
}

const LABEL = "text-[0.8125rem] font-semibold text-ink-800"
const ITEM = "gap-1.5"

export function PartnerApplicationForm({ type }: { type: PartnerType }) {
  const { data: session } = useSession()
  const copy = COPY[type]
  const [state, setState] = React.useState<
    | { status: "idle" }
    | { status: "submitting" }
    | { status: "success" }
    | { status: "error"; message: string }
  >({ status: "idle" })

  const form = useForm<PartnerApplicationInput>({
    resolver: zodResolver(partnerApplicationSchema),
    defaultValues: { name: "", email: "", phone: "", organization: "", purpose: "", details: "" },
  })

  // Prefill from session when available
  React.useEffect(() => {
    if (session?.user?.name && !form.getValues("name")) form.setValue("name", session.user.name)
    if (session?.user?.email && !form.getValues("email")) form.setValue("email", session.user.email)
  }, [form, session?.user?.email, session?.user?.name])

  async function onSubmit(values: PartnerApplicationInput) {
    const message = [
      values.organization ? `Organization: ${values.organization}` : null,
      `Purpose: ${values.purpose}`,
      "",
      values.details,
    ]
      .filter((line) => line !== null)
      .join("\n")

    setState({ status: "submitting" })
    try {
      await inquiriesService.create(
        {
          type: type.toUpperCase(),
          name: values.name,
          email: values.email,
          phone: values.phone,
          message,
        },
        session?.accessToken,
      )
      setState({ status: "success" })
      form.reset()
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not submit your application. Please try again."
      setState({ status: "error", message: msg })
    }
  }

  if (state.status === "success") {
    return (
      <FormSuccess
        title="Application received"
        actions={
          <button type="button" className="btn-glass" onClick={() => setState({ status: "idle" })}>
            Submit another
          </button>
        }
      >
        Thanks! Our team will review your {type} application and reach out shortly.
      </FormSuccess>
    )
  }

  const submitting = state.status === "submitting"

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3.5 md:[&_input:not([type=checkbox])]:h-10">
        {/* Fields rise in one after another on first paint. */}
        <div className="reveal-stagger grid gap-3.5">
          <div className="grid gap-3.5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className={ITEM}>
                  <FormLabel className={LABEL}>Full name *</FormLabel>
                  <FormControl>
                    <Input autoComplete="name" placeholder="Rahim Uddin" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem className={ITEM}>
                  <FormLabel className={LABEL}>Mobile *</FormLabel>
                  <FormControl>
                    <Input type="tel" autoComplete="tel" placeholder="+8801712345678" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className={ITEM}>
                  <FormLabel className={LABEL}>Email *</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" placeholder="you@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="organization"
              render={({ field }) => (
                <FormItem className={ITEM}>
                  <FormLabel className={LABEL}>Company / Organization</FormLabel>
                  <FormControl>
                    <Input autoComplete="organization" placeholder="ABC Trading Ltd. (optional)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="purpose"
            render={({ field }) => (
              <FormItem className={ITEM}>
                <FormLabel className={LABEL}>{copy.purposeLabel} *</FormLabel>
                <FormControl>
                  <Input placeholder={copy.purposePlaceholder} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="details"
            render={({ field }) => (
              <FormItem className={ITEM}>
                <FormLabel className={LABEL}>{copy.detailsLabel} *</FormLabel>
                <FormControl>
                  <Textarea rows={4} placeholder={copy.detailsPlaceholder} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

        </div>

        {state.status === "error" && (
          <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>{state.message}</span>
          </div>
        )}

        {/* md and up: a normal submit under the form. */}
        <div className="hidden justify-end border-t border-border/60 pt-4 md:flex">
          <button type="submit" disabled={submitting} className="btn-tactile btn-tactile--sm">
            {submitting ? (
              <>
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                <SendHorizontal aria-hidden="true" className="size-4" />
                Submit application
              </>
            )}
          </button>
        </div>

        {/* Phones: the submit stays at thumb reach while the long form scrolls. */}
        <MobileActionBar label="Submit application">
          <button type="submit" disabled={submitting} className="btn-tactile btn-tactile--block flex-1">
            {submitting ? (
              <>
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                <SendHorizontal aria-hidden="true" className="size-4" />
                Submit application
              </>
            )}
          </button>
        </MobileActionBar>
      </form>
    </Form>
  )
}

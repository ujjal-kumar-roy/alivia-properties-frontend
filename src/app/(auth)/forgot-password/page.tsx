"use client"

import { useState } from "react"
import { AnimatePresence } from "motion/react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ArrowLeft } from "lucide-react"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { FormSuccess } from "@/components/booking/form-success"
import { ROUTES } from "@/config/routes.config"
import { authService } from "@/services/auth.service"
import { ApiError } from "@/services/http-client"
import { ENTER_RISE, FIELD_MESSAGE, Reveal, SubmitLabel } from "../_components/auth-motion"

const schema = z.object({ email: z.string().email("Invalid email address") })
type Input = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const form = useForm<Input>({ resolver: zodResolver(schema) })

  async function onSubmit(values: Input) {
    setSubmitError(null)

    try {
      await authService.forgotPassword(values.email)
      setSent(true)
    } catch (error) {
      setSubmitError(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Could not send the reset email right now.",
      )
    }
  }

  return (
    <>
      <Link href={ROUTES.LOGIN} className="glass-chip mb-3 gap-1 pl-2.5 sm:mb-5">
        <ArrowLeft aria-hidden="true" className="size-4" /> Back to Login
      </Link>

      <div className="mb-3.5 sm:mb-6">
        <h1 className="font-heading text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">Reset your password</h1>
        <p className="mt-0.5 text-[0.8125rem] text-ink-600 sm:text-sm">
          Enter your registered email and we&apos;ll send you a reset link.
        </p>
      </div>

      {sent ? (
        <div className={`space-y-3 ${ENTER_RISE}`}>
          <FormSuccess title="Check your inbox" confetti={false} className="border-0 bg-transparent p-0 sm:p-0">
            If an account exists for that email, a reset link has been sent.
          </FormSuccess>
          <Link href={ROUTES.LOGIN} className="btn-tactile btn-tactile--block">
            Return to Login
          </Link>
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3.5 md:[&_input:not([type=checkbox])]:h-10">
            <AnimatePresence initial={false}>
              {submitError && (
                <Reveal key="submit-error" className="pb-3.5">
                  <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {submitError}
                  </div>
                </Reveal>
              )}
            </AnimatePresence>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="gap-1.5">
                  <FormLabel className="text-[0.8125rem] font-semibold text-ink-800">Email Address</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" placeholder="you@example.com" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage className={FIELD_MESSAGE} />
                </FormItem>
              )}
            />
            <button
              type="submit"
              className="btn-tactile btn-tactile--block"
              disabled={form.formState.isSubmitting}
            >
              <SubmitLabel busy={form.formState.isSubmitting} idle="Send Reset Link" busyLabel="Sending…" />
            </button>
          </form>
        </Form>
      )}
    </>
  )
}

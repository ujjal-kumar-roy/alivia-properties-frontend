"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Loader2, MailWarning, RotateCw } from "lucide-react"

import { FormSuccess } from "@/components/booking/form-success"
import { Input } from "@/components/ui/input"
import { ROUTES } from "@/config/routes.config"
import { authService } from "@/services/auth.service"
import { ApiError } from "@/services/http-client"

type Status = "verifying" | "success" | "error" | "missing"

export function VerifyEmailClient({ token }: { token: string | null }) {
  const [status, setStatus] = useState<Status>(token ? "verifying" : "missing")
  const [errorMsg, setErrorMsg] = useState<string>("")

  // resend state
  const [email, setEmail] = useState("")
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const [resendError, setResendError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    let active = true
    ;(async () => {
      try {
        await authService.verifyEmail(token)
        if (active) setStatus("success")
      } catch (err) {
        if (!active) return
        setErrorMsg(
          err instanceof ApiError
            ? err.message
            : "We couldn't verify your email. The link may be invalid or expired.",
        )
        setStatus("error")
      }
    })()
    return () => {
      active = false
    }
  }, [token])

  async function handleResend(e: React.FormEvent) {
    e.preventDefault()
    setResendError(null)
    const value = email.trim()
    if (!value) {
      setResendError("Enter your email address.")
      return
    }
    setResending(true)
    try {
      await authService.resendVerification(value)
      setResent(true)
    } catch (err) {
      setResendError(
        err instanceof ApiError ? err.message : "Could not resend the verification email.",
      )
    } finally {
      setResending(false)
    }
  }

  if (status === "verifying") {
    return (
      <div className="flex flex-col items-center gap-2 py-4 text-center">
        <Loader2 aria-hidden="true" className="size-9 animate-spin text-brand-600" />
        <h1 className="font-heading text-xl font-bold text-ink-900">Verifying your email…</h1>
        <p className="text-sm text-ink-600">This will only take a moment.</p>
      </div>
    )
  }

  if (status === "success") {
    return (
      <div className="space-y-3">
        <h1 className="sr-only">Email verified</h1>
        <FormSuccess title="Email verified!" confetti={false} className="border-0 bg-transparent p-0 sm:p-0">
          Your Alivia Properties account is now active. You can sign in and start exploring.
        </FormSuccess>
        <Link href={ROUTES.LOGIN} className="btn-tactile btn-tactile--block">
          Continue to sign in
        </Link>
      </div>
    )
  }

  // error or missing token → show explanation + resend form
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-1.5 text-center">
        <MailWarning aria-hidden="true" className="size-9 text-amber-500" />
        <h1 className="font-heading text-xl font-bold text-ink-900">
          {status === "missing" ? "Verify your email" : "Verification failed"}
        </h1>
        <p className="text-sm text-ink-600">
          {status === "missing"
            ? "This page needs a verification link. Request a new one below."
            : errorMsg}
        </p>
      </div>

      {resent ? (
        <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-center text-sm text-emerald-800">
          If an account exists for that email, a new verification link is on its way. Check
          your inbox.
        </div>
      ) : (
        <form onSubmit={handleResend} className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="resend-email" className="block text-[0.8125rem] font-semibold text-ink-800">
              Resend verification link
            </label>
            <Input
              id="resend-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="md:h-10"
              aria-invalid={resendError ? true : undefined}
              aria-describedby={resendError ? "resend-email-error" : undefined}
            />
            {resendError && (
              <p id="resend-email-error" role="alert" className="text-[0.8125rem] font-medium text-destructive">
                {resendError}
              </p>
            )}
          </div>
          <button type="submit" disabled={resending} className="btn-tactile btn-tactile--block">
            {resending ? (
              <>
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> Sending…
              </>
            ) : (
              <>
                <RotateCw aria-hidden="true" className="h-4 w-4" /> Resend verification email
              </>
            )}
          </button>
        </form>
      )}

      <div className="flex items-center justify-center gap-2 text-sm text-ink-600">
        Already verified?
        <Link href={ROUTES.LOGIN} className="glass-chip">
          Sign in
        </Link>
      </div>
    </div>
  )
}

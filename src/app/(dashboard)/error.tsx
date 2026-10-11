"use client"

import { Button } from "@/components/ui/button"
import { ROUTES } from "@/config/routes.config"
import { AlertTriangle, ArrowLeft, LogIn, ShieldOff } from "lucide-react"
import Link from "next/link"
import { useEffect } from "react"

type ErrorKind = "unauthorized" | "forbidden" | "generic"

function classify(error: Error): { kind: ErrorKind; backendMessage?: string } {
  const msg = error.message ?? ""
  const lower = msg.toLowerCase()

  // Our httpClient throws `ApiError(msg, status, body)`. The status isn't on a
  // plain Error after Next serializes it across the RSC boundary, so sniff by
  // the message string (backend NestJS sends "Unauthorized" / "Forbidden …").
  if (lower === "unauthorized" || lower.startsWith("unauthorized")) {
    return { kind: "unauthorized", backendMessage: msg }
  }
  if (lower === "forbidden" || lower.startsWith("forbidden") || lower.includes("permission")) {
    return { kind: "forbidden", backendMessage: msg }
  }
  return { kind: "generic", backendMessage: msg }
}

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Dashboard error boundary caught:", error)
  }, [error])

  const { kind, backendMessage } = classify(error)

  if (kind === "unauthorized") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
          <LogIn className="h-8 w-8 text-amber-600" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-ink-900">Session expired</h1>
        <p className="mb-6 max-w-md text-sm text-ink-600">
          Your sign-in session has expired or the server didn&apos;t receive valid
          credentials. Please sign in again to continue.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button className="gap-2 bg-brand-700 text-white hover:bg-brand-800" render={<Link href={ROUTES.LOGIN} />}>
            <LogIn className="h-4 w-4" /> Sign in again
          </Button>
          <Button variant="outline" onClick={reset} className="gap-2">
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (kind === "forbidden") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
          <ShieldOff className="h-8 w-8 text-red-500" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-ink-900">Access denied</h1>
        <p className="mb-6 max-w-md text-sm text-ink-600">
          You don&apos;t have permission to view this page. If you think this
          is a mistake, sign in with an account that has the required role.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="outline" className="gap-2" render={<Link href={ROUTES.HOME} />}>
            <ArrowLeft className="h-4 w-4" /> Go home
          </Button>
          <Button className="bg-brand-700 text-white hover:bg-brand-800" render={<Link href={ROUTES.LOGIN} />}>
            Switch account
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-rose-50">
        <AlertTriangle className="h-8 w-8 text-rose-500" />
      </div>
      <h1 className="mb-2 text-2xl font-bold text-ink-900">Something went wrong</h1>
      <p className="mb-6 max-w-md text-sm text-ink-600">
        {backendMessage || "An unexpected error occurred while loading this page."}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button variant="outline" onClick={reset} className="gap-2">
          Try again
        </Button>
        <Button variant="outline" className="gap-2" render={<Link href={ROUTES.HOME} />}>
          <ArrowLeft className="h-4 w-4" /> Go home
        </Button>
      </div>
    </div>
  )
}

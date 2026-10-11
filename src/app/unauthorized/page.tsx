import Link from "next/link"
import { ShieldOff, ArrowLeft } from "lucide-react"
import { ROUTES } from "@/config/routes.config"

export default function UnauthorizedPage() {
  return (
    <div className="bg-brand-aurora flex min-h-dvh flex-col items-center justify-center px-4 py-8 text-center">
      <div className="liquid-glass w-full max-w-sm rounded-2xl border p-5 sm:p-8">
        <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-red-50">
          <ShieldOff aria-hidden="true" className="size-7 text-red-500" />
        </div>
        <h1 className="font-heading text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">Access Denied</h1>
        <p className="mx-auto mt-1.5 max-w-xs text-[0.9375rem] leading-snug text-ink-600">
          You do not have permission to view this page. Please sign in with the correct account.
        </p>
        <div className="mt-5 flex gap-2">
          <Link href={ROUTES.HOME} className="btn-glass flex-1 gap-1.5">
            <ArrowLeft aria-hidden="true" className="size-4" /> Go Home
          </Link>
          <Link href={ROUTES.LOGIN} className="btn-tactile btn-tactile--sm flex-1">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}

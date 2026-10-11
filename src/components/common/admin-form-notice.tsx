import { ShieldCheck } from "lucide-react"

/**
 * Shown in place of a public lead-capture form (contact, consultation, etc.)
 * when an admin is signed in. Admins receive and action these submissions from
 * their dashboard, so they never need to submit one themselves.
 */
export function AdminFormNotice({ manageHref }: { manageHref?: string }) {
  return (
    <div className="rounded-xl border border-brand-100 bg-brand-50/70 p-8 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-100">
        <ShieldCheck className="h-6 w-6 text-brand-700" />
      </div>
      <h3 className="text-base font-bold text-ink-900">You&apos;re signed in as an administrator</h3>
      <p className="mt-1 text-sm text-ink-600">
        Submissions from this form are managed from your dashboard, so there&apos;s no need to send one yourself.
      </p>
      {manageHref && (
        <a
          href={manageHref}
          className="mt-4 inline-flex items-center justify-center rounded-full bg-brand-700 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-800"
        >
          Go to dashboard
        </a>
      )}
    </div>
  )
}

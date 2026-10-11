"use client"

import { Printer } from "lucide-react"

/**
 * Tiny leaf client component — the only interactive bit a legal page needs.
 * Kept separate from LegalPageShell so the shell and both /privacy and /terms
 * pages stay Server Components (see AGENTS.md §4.2 "Server-first"). The shell
 * hides it on phones, where "print this page" is not something people do.
 */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-full text-sm text-ink-600 transition-colors hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
    >
      <Printer className="h-3.5 w-3.5" aria-hidden="true" />
      Save / print this page
    </button>
  )
}

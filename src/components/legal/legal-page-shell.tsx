import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowUp, Calendar } from "lucide-react"
import { PrintButton } from "@/components/legal/print-button"

interface TocEntry {
  id: string
  label: string
}

interface LegalPageShellProps {
  eyebrow: string
  title: string
  description: string
  lastUpdated: string
  toc: TocEntry[]
  otherDocument: { label: string; href: string }
  children: ReactNode
}

/**
 * Shared chrome for /privacy and /terms: a calm document hero, a sticky
 * "on this page" outline (a native <details> on mobile, a sticky rail on
 * desktop — both plain anchor links, no client JS needed to jump sections),
 * and a cross-link to the sibling policy at the end. Content itself stays in
 * each page file as plain JSX so it reads and edits like a document, not a
 * data-driven template.
 */
export function LegalPageShell({
  eyebrow,
  title,
  description,
  lastUpdated,
  toc,
  otherDocument,
  children,
}: LegalPageShellProps) {
  return (
    <div className="pb-16 md:pb-24">
      {/* Hero */}
      <div className="bg-brand-aurora border-b border-border">
        <div className="container-page py-12 md:py-16">
          <div className="max-w-3xl">
            <p className="text-eyebrow mb-3">{eyebrow}</p>
            <h1 className="text-h1 text-balance mb-4">{title}</h1>
            <p className="text-lead mb-6 max-w-[65ch]">{description}</p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
                Last updated {lastUpdated}
              </span>
              <span className="hidden h-3.5 w-px bg-border sm:inline-block" aria-hidden="true" />
              <span className="print:hidden">
                <PrintButton />
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="container-page pt-10 md:pt-14">
        {/* Mobile / tablet outline — native disclosure, no JS */}
        <details className="mb-8 rounded-2xl border border-border bg-white p-4 lg:hidden print:hidden">
          <summary className="cursor-pointer text-sm font-semibold text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300">
            On this page
          </summary>
          <nav aria-label="Sections on this page" className="mt-3 space-y-0.5">
            {toc.map((entry, index) => (
              <a
                key={entry.id}
                href={`#${entry.id}`}
                className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm text-muted-foreground transition-colors hover:bg-brand-50 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
              >
                <span className="text-xs tabular-nums text-ink-400">{index + 1}</span>
                {entry.label}
              </a>
            ))}
          </nav>
        </details>

        <div className="grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-14">
          {/* Desktop sticky outline */}
          <aside className="hidden lg:block print:hidden">
            <nav aria-label="Sections on this page" className="sticky top-28">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-ink-400">
                On this page
              </p>
              <ol className="max-h-[calc(100vh-9rem)] space-y-0.5 overflow-y-auto border-l border-border pr-2">
                {toc.map((entry, index) => (
                  <li key={entry.id}>
                    <a
                      href={`#${entry.id}`}
                      className="-ml-px flex items-baseline gap-2 border-l-2 border-transparent py-1.5 pl-4 text-sm text-muted-foreground transition-colors hover:border-brand-300 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                    >
                      <span className="text-xs tabular-nums text-ink-400">{index + 1}</span>
                      <span>{entry.label}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          {/* Document body */}
          <div className="min-w-0 max-w-[72ch]">
            {children}

            <div className="mt-14 flex flex-col gap-4 border-t border-border pt-8 text-sm sm:flex-row sm:items-center sm:justify-between print:hidden">
              <Link
                href={otherDocument.href}
                className="inline-flex min-h-11 items-center font-semibold text-brand-700 transition-colors hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
              >
                {otherDocument.label} →
              </Link>
              <a
                href="#main-content"
                className="inline-flex min-h-11 items-center gap-1.5 text-muted-foreground transition-colors hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
              >
                <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                Back to top
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowUp, Calendar, ChevronDown } from "lucide-react"
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
 * Shared chrome for /privacy and /terms: a short document header, an "on this
 * page" outline (a collapsible <details> right under the header on phones and
 * tablets, a sticky rail on desktop; both are plain anchor links, no client JS
 * needed to jump sections), and a cross-link to the sibling policy at the end.
 * Content itself stays in each page file as plain JSX so it reads and edits
 * like a document, not a data-driven template.
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
    <div className="pb-10 md:pb-24">
      {/* Header: title, a short summary and the date. Short on phones. */}
      <div className="bg-brand-aurora border-b border-border">
        <div className="container-page py-4 sm:py-10 md:py-16">
          <div className="max-w-3xl">
            <p className="text-eyebrow mb-3 hidden sm:block">{eyebrow}</p>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-balance text-ink-900 sm:text-4xl md:text-5xl">
              {title}
            </h1>
            <p className="mt-1.5 line-clamp-2 max-w-[65ch] text-[0.9375rem] leading-snug text-ink-600 sm:mt-4 sm:line-clamp-none sm:text-lg sm:leading-relaxed">
              {description}
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-2 sm:mt-6">
              <span className="inline-flex items-center gap-1.5 text-[0.8125rem] text-ink-600 sm:text-sm">
                <Calendar className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
                Last updated {lastUpdated}
              </span>
              {/* Printing is a desktop habit: hidden on phones. */}
              <span className="hidden h-3.5 w-px bg-border sm:inline-block" aria-hidden="true" />
              <span className="hidden sm:inline-flex print:hidden">
                <PrintButton />
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="container-page pt-3 md:pt-14">
        {/* Phones and tablets: the outline is a collapsible <details> at the top. */}
        <details className="group mb-4 rounded-2xl border border-border bg-white lg:hidden print:hidden md:mb-8">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-2xl px-3.5 text-sm font-semibold text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 [&::-webkit-details-marker]:hidden">
            On this page
            <ChevronDown
              aria-hidden="true"
              className="size-4 text-ink-500 transition-transform duration-200 group-open:rotate-180"
            />
          </summary>
          <nav aria-label="Sections on this page" className="border-t border-border/60 px-1.5 pb-1.5 pt-1">
            {toc.map((entry, index) => (
              <a
                key={entry.id}
                href={`#${entry.id}`}
                className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm text-ink-700 transition-colors active:bg-brand-50 hover:bg-brand-50 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
              >
                <span className="w-5 text-xs tabular-nums text-ink-500">{index + 1}</span>
                {entry.label}
              </a>
            ))}
          </nav>
        </details>

        <div className="grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-14">
          {/* Desktop sticky outline */}
          <aside className="hidden lg:block print:hidden">
            <nav aria-label="Sections on this page" className="sticky top-28">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
                On this page
              </p>
              <ol className="max-h-[calc(100vh-9rem)] space-y-0.5 overflow-y-auto border-l border-border pr-2">
                {toc.map((entry, index) => (
                  <li key={entry.id}>
                    <a
                      href={`#${entry.id}`}
                      className="-ml-px flex items-baseline gap-2 border-l-2 border-transparent py-1.5 pl-4 text-sm text-muted-foreground transition-colors hover:border-brand-300 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                    >
                      <span className="text-xs tabular-nums text-ink-500">{index + 1}</span>
                      <span>{entry.label}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          {/* Document body: 16px text in a comfortable reading measure. */}
          <div className="min-w-0 max-w-[72ch]">
            {children}

            <div className="mt-10 flex flex-col gap-1 border-t border-border pt-5 text-sm sm:mt-14 sm:flex-row sm:items-center sm:justify-between sm:pt-8 print:hidden">
              <Link
                href={otherDocument.href}
                className="inline-flex min-h-11 items-center font-semibold text-brand-700 transition-colors hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
              >
                {otherDocument.label} →
              </Link>
              <a
                href="#main-content"
                className="inline-flex min-h-11 items-center gap-1.5 text-ink-600 transition-colors hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
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

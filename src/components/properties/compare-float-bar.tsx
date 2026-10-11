"use client"

import Link from "next/link"
import { GitCompare, X } from "lucide-react"
import { useCompareProperties } from "@/hooks/use-compare-properties"
import { ROUTES } from "@/config/routes.config"

export function CompareFloatBar() {
  const { list, clear } = useCompareProperties()

  if (list.length < 2) return null

  return (
    <div className="fixed bottom-[calc(1.25rem+var(--bottom-bar-h))] left-3 z-50 flex w-[calc(100%-5.5rem)] max-w-xl items-center gap-2.5 rounded-[1.4rem] border border-white/10 bg-ink-900/96 px-3.5 py-2 text-white shadow-pop backdrop-blur-xl animate-in slide-in-from-bottom-4 duration-200 sm:bottom-[calc(1.5rem+var(--bottom-bar-h))] sm:left-1/2 sm:w-[calc(100%-1.5rem)] sm:-translate-x-1/2 sm:gap-4 sm:px-5 sm:py-3">
      <GitCompare aria-hidden="true" className="h-4 w-4 text-brand-400 shrink-0" />
      <span className="text-sm font-medium">
        <span className="sm:hidden">{list.length} selected</span>
        <span className="hidden sm:inline">{list.length} properties selected</span>
      </span>
      <Link
        href={ROUTES.COMPARE}
        className="btn-tactile btn-tactile--gold btn-tactile--sm ml-auto shrink-0"
      >
        Compare now
      </Link>
      <button
        type="button"
        onClick={clear}
        className="shrink-0 cursor-pointer rounded-full p-1 transition-colors hover:bg-white/10"
        aria-label="Clear compare list"
      >
        <X aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  )
}

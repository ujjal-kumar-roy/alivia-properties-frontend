"use client"

import Link from "next/link"
import { AnimatePresence, motion } from "motion/react"
import { GitCompare, X } from "lucide-react"
import { useCompareProperties } from "@/hooks/use-compare-properties"
import { ROUTES } from "@/config/routes.config"
import { haptic } from "@/lib/celebrate"
import { springs } from "@/lib/motion"

export function CompareFloatBar() {
  const { list, clear } = useCompareProperties()

  const open = list.length >= 2

  return (
    <AnimatePresence>
      {open && (
    <motion.div
      key="compare-bar"
      initial={{ y: 32, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 32, opacity: 0 }}
      transition={springs.sheet}
      className="fixed bottom-[calc(1.25rem+var(--bottom-bar-h))] left-3 z-50 flex w-[calc(100%-5.5rem)] max-w-xl items-center gap-2.5 rounded-[1.4rem] border border-white/10 bg-ink-900/96 px-3.5 py-2 text-white shadow-pop backdrop-blur-xl sm:bottom-[calc(1.5rem+var(--bottom-bar-h))] sm:left-1/2 sm:w-[calc(100%-1.5rem)] sm:-translate-x-1/2 sm:gap-4 sm:px-5 sm:py-3">
      <GitCompare aria-hidden="true" className="h-4 w-4 text-brand-400 shrink-0" />
      <span className="text-sm font-medium">
        <span className="sm:hidden">{list.length} selected</span>
        <span className="hidden sm:inline">{list.length} properties selected</span>
      </span>
      <Link
        href={ROUTES.COMPARE}
        onClick={() => haptic("tap")}
        className="btn-tactile btn-tactile--gold btn-tactile--sm ml-auto shrink-0"
      >
        Compare now
      </Link>
      <button
        type="button"
        onClick={() => {
          haptic("tap")
          clear()
        }}
        className="-my-2 -mr-1.5 grid size-11 shrink-0 cursor-pointer place-items-center rounded-full transition-[background-color,scale] hover:bg-white/10 active:scale-90 motion-reduce:active:scale-100"
        aria-label="Clear compare list"
      >
        <X aria-hidden="true" className="h-4 w-4" />
      </button>
    </motion.div>
      )}
    </AnimatePresence>
  )
}

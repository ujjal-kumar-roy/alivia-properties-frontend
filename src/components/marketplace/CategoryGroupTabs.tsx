"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

type Tab = {
  slug: string
  name: string
  count: number
}

/**
 * Sticky scroll-spy tab bar for the department sections (`#group-<slug>`).
 * A Liquid Glass bar with 36px glass chips on one scrollable row. The active
 * tab follows the page with an IntersectionObserver (no scroll listener): the
 * section crossing the band just under the bar is the current one.
 */
export function CategoryGroupTabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0]?.slug ?? "")
  const railRef = useRef<HTMLDivElement>(null)

  // Scroll-spy: mark the group whose section crosses the band below the bar.
  useEffect(() => {
    const inBand = new Set<string>()
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const slug = entry.target.id.replace(/^group-/, "")
          if (entry.isIntersecting) inBand.add(slug)
          else inBand.delete(slug)
        }
        const first = tabs.find((tab) => inBand.has(tab.slug))
        if (first) setActive(first.slug)
      },
      { rootMargin: "-72px 0px -65% 0px", threshold: 0 },
    )
    for (const tab of tabs) {
      const el = document.getElementById(`group-${tab.slug}`)
      if (el) io.observe(el)
    }
    return () => io.disconnect()
  }, [tabs])

  // When the active tab changes, bring it into view in the rail.
  useEffect(() => {
    const rail = railRef.current
    if (!rail) return
    const btn = rail.querySelector<HTMLElement>(`[data-slug="${active}"]`)
    if (btn) {
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      rail.scrollTo({
        left: btn.offsetLeft - (rail.clientWidth - btn.offsetWidth) / 2,
        behavior: reducedMotion ? "auto" : "smooth",
      })
    }
  }, [active])

  function scrollTo(slug: string) {
    const el = document.getElementById(`group-${slug}`)
    if (!el) return
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const top = el.getBoundingClientRect().top + window.scrollY - 72
    window.scrollTo({ top, behavior: reducedMotion ? "auto" : "smooth" })
    setActive(slug)
  }

  return (
    <nav
      aria-label="Marketplace departments"
      className="liquid-glass-nav scroll-edge sticky top-0 z-30 border-b"
    >
      <div className="container-page">
        <div
          ref={railRef}
          className="relative flex gap-1.5 overflow-x-auto py-1.5 scrollbar-none sm:py-2"
        >
          {tabs.map((tab) => (
            <button
              key={tab.slug}
              data-slug={tab.slug}
              type="button"
              aria-current={active === tab.slug ? "page" : undefined}
              onClick={() => scrollTo(tab.slug)}
              className="glass-chip gap-1.5"
            >
              {tab.name}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[0.6875rem] font-semibold tabular-nums",
                  active === tab.slug ? "bg-white/25 text-white" : "bg-ink-100 text-ink-600",
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  )
}

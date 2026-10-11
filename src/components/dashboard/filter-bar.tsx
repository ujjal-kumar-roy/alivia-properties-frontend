"use client"

import { useEffect, useRef, useState } from "react"
import { SlidersHorizontal } from "lucide-react"

import { GlassSheet } from "@/components/common/glass-sheet"
import { cn } from "@/lib/utils"

export type FilterOption = { value: string; label: string }

export type FilterGroup = {
  /** URL / state key. Also the React key. */
  name: string
  label: string
  value: string
  options: FilterOption[]
  /** The option that means "no filter". Defaults to `"all"`. */
  allValue?: string
}

type FilterBarProps = {
  groups: FilterGroup[]
  onChange: (name: string, value: string) => void
  className?: string
}

function Chips({
  group,
  onSelect,
  className,
  revealActive = false,
}: {
  group: FilterGroup
  onSelect: (value: string) => void
  className?: string
  /** Scroll the selected chip into view when the row first appears (a long row starts at its left edge). */
  revealActive?: boolean
}) {
  const rowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!revealActive) return
    const row = rowRef.current
    const active = row?.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (!row || !active || row.scrollWidth <= row.clientWidth) return
    row.scrollTo({ left: Math.max(0, active.offsetLeft - (row.clientWidth - active.offsetWidth) / 2) })
  }, [revealActive])

  return (
    <div ref={rowRef} role="group" aria-label={group.label} className={className}>
      {group.options.map((option) => (
        <button
          key={option.value}
          type="button"
          className="glass-chip backdrop-blur-none"
          aria-pressed={group.value === option.value}
          onClick={() => onSelect(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

/**
 * Filters for a dashboard list.
 *
 * - The first group is always visible as one row of 36px chips: it scrolls sideways on phones
 *   (never wraps) and wraps from sm up.
 * - Further groups sit inline from sm up. On phones they move behind one `Filters` button that
 *   opens a bottom sheet, so a second and third chip row never push the data off the first screen.
 */
export function FilterBar({ groups, onChange, className }: FilterBarProps) {
  const [open, setOpen] = useState(false)
  const [primary, ...extra] = groups
  if (!primary) return null

  const activeExtra = extra.filter((g) => g.value !== (g.allValue ?? "all")).length

  function select(name: string, value: string, closeSheet = false) {
    onChange(name, value)
    if (closeSheet) setOpen(false)
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Chips
        group={primary}
        onSelect={(value) => select(primary.name, value)}
        revealActive
        className={cn(
          // One row that scrolls sideways on phones and bleeds to the screen edge; wraps from sm up.
          "relative -ml-3 flex min-w-0 flex-1 gap-1.5 overflow-x-auto py-1 pl-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:ml-0 sm:flex-wrap sm:overflow-visible sm:p-0",
          extra.length === 0 && "-mr-3 pr-3 sm:mr-0 sm:pr-0",
        )}
      />

      {extra.map((group) => (
        <div key={group.name} className="hidden items-center gap-2 sm:flex">
          <span aria-hidden className="h-5 w-px bg-border" />
          <Chips group={group} onSelect={(value) => select(group.name, value)} className="flex flex-wrap gap-1.5" />
        </div>
      ))}

      {extra.length > 0 ? (
        <>
          <button
            type="button"
            className="btn-glass relative shrink-0 sm:hidden"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
          >
            <SlidersHorizontal aria-hidden className="size-4" />
            Filters
            {activeExtra > 0 ? (
              <span className="flex size-5 items-center justify-center rounded-full bg-brand-700 text-[0.6875rem] font-bold text-white">
                {activeExtra}
              </span>
            ) : null}
          </button>

          <GlassSheet
            open={open}
            onOpenChange={setOpen}
            title="Filters"
            footer={
              activeExtra > 0 ? (
                <button
                  type="button"
                  className="btn-glass w-full"
                  onClick={() => {
                    for (const group of extra) onChange(group.name, group.allValue ?? "all")
                    setOpen(false)
                  }}
                >
                  Clear filters
                </button>
              ) : null
            }
          >
            <div className="space-y-4 pb-1">
              {extra.map((group) => (
                <div key={group.name}>
                  <p className="mb-2 text-sm font-semibold text-ink-800">{group.label}</p>
                  <Chips
                    group={group}
                    onSelect={(value) => select(group.name, value, true)}
                    className="flex flex-wrap gap-2"
                  />
                </div>
              ))}
            </div>
          </GlassSheet>
        </>
      ) : null}
    </div>
  )
}

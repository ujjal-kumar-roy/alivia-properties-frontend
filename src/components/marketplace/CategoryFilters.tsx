"use client"

import { useState, useSyncExternalStore, type ReactNode } from "react"
import { Menu } from "@base-ui/react/menu"
import { Popover } from "@base-ui/react/popover"
import { ArrowUpDown, Check, SlidersHorizontal } from "lucide-react"

import { GlassSheet } from "@/components/common/glass-sheet"
import {
  KIND_OPTIONS,
  sortOptionsFor,
  type KindKey,
  type ListingView,
  type SortKey,
} from "@/components/marketplace/category-filters"
import { haptic } from "@/lib/celebrate"
import { cn } from "@/lib/utils"

/**
 * The Sort and Filters controls of the category toolbar. Each is one trigger
 * button with two surfaces: a bottom sheet on phones (thumb reach, the app's
 * existing GlassSheet) and an anchored popover from `md` up. Neither navigates
 * by itself: they report the choice and the toolbar owns the URL, because the
 * listing is server rendered and the URL is the single source of truth.
 */

const DESKTOP_QUERY = "(min-width: 768px)"

/** False on the server and the first client render, so phones never hydrate a popover. */
function useIsDesktop() {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(DESKTOP_QUERY)
      mql.addEventListener("change", onChange)
      return () => mql.removeEventListener("change", onChange)
    },
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  )
}

// Hover styles come from Tailwind's `hover:` variant, which is already emitted
// inside (hover: hover), so touch screens never get a stuck hover.
const triggerBase =
  "relative inline-flex h-11 w-11 shrink-0 items-center justify-center gap-1.5 rounded-full border text-sm font-semibold transition-[background-color,border-color,color,scale] duration-140 ease-(--ease-out) active:scale-[0.97] motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 data-popup-open:bg-ink-100 sm:w-auto sm:px-3.5"

function triggerClass(highlighted: boolean) {
  return cn(
    triggerBase,
    highlighted
      ? "border-brand-300 bg-brand-50 text-brand-800 hover:bg-brand-100"
      : "border-ink-200 bg-white text-ink-800 hover:border-ink-300 hover:bg-ink-50",
  )
}

// Origin-aware (--transform-origin comes from the trigger the popup is anchored
// to), scale 0.97 + fade in 180ms; it leaves a little faster than it arrives.
const popupMotion =
  "origin-(--transform-origin) transition-[opacity,scale] duration-180 ease-(--ease-out) data-starting-style:scale-[0.97] data-starting-style:opacity-0 data-ending-style:scale-[0.97] data-ending-style:opacity-0 data-ending-style:duration-120 motion-reduce:duration-150 motion-reduce:data-starting-style:scale-100 motion-reduce:data-ending-style:scale-100"

const popupSurface =
  "rounded-2xl border border-ink-200 bg-white text-ink-900 shadow-[var(--shadow-pop)] outline-none"

/* ── Sort ─────────────────────────────────────────────────────────────────── */

type SortControlProps = {
  view: ListingView
  sort: SortKey
  onChange: (sort: SortKey) => void
}

export function SortControl({ view, sort, onChange }: SortControlProps) {
  const isDesktop = useIsDesktop()
  const options = sortOptionsFor(view)
  const highlighted = sort !== "newest"

  function choose(next: SortKey) {
    if (next !== sort) onChange(next)
  }

  const label = (
    <>
      <ArrowUpDown aria-hidden="true" className="size-4 shrink-0" />
      <span className="max-sm:sr-only">Sort</span>
    </>
  )

  return isDesktop ? (
    <SortMenu options={options} sort={sort} highlighted={highlighted} onChoose={choose}>
      {label}
    </SortMenu>
  ) : (
    <SortSheet options={options} sort={sort} highlighted={highlighted} onChoose={choose}>
      {label}
    </SortSheet>
  )
}

type SortSurfaceProps = {
  options: ReturnType<typeof sortOptionsFor>
  sort: SortKey
  highlighted: boolean
  onChoose: (sort: SortKey) => void
  children: ReactNode
}

function SortSheet({ options, sort, highlighted, onChoose, children }: SortSurfaceProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={triggerClass(highlighted)}
      >
        {children}
      </button>

      <GlassSheet open={open} onOpenChange={setOpen} title="Sort by">
        <div
          role="radiogroup"
          aria-label="Sort by"
          className="grid gap-2 pb-[env(safe-area-inset-bottom)] pt-1"
        >
          {options.map((option) => (
            <OptionRow
              key={option.value}
              label={option.label}
              selected={sort === option.value}
              onSelect={() => {
                setOpen(false)
                onChoose(option.value)
              }}
            />
          ))}
        </div>
      </GlassSheet>
    </>
  )
}

function SortMenu({ options, sort, highlighted, onChoose, children }: SortSurfaceProps) {
  return (
    <Menu.Root>
      <Menu.Trigger className={triggerClass(highlighted)}>{children}</Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={8} className="isolate z-50 outline-none">
          <Menu.Popup className={cn(popupMotion, popupSurface, "min-w-56 p-1.5")}>
            <Menu.RadioGroup
              value={sort}
              aria-label="Sort by"
              onValueChange={(value) => onChoose(value as SortKey)}
            >
              {options.map((option) => (
                <Menu.RadioItem
                  key={option.value}
                  value={option.value}
                  closeOnClick
                  className="flex min-h-10 cursor-default select-none items-center gap-3 rounded-xl px-3 text-sm font-semibold text-ink-800 outline-none transition-colors duration-140 ease-(--ease-out) data-highlighted:bg-ink-100 data-checked:text-brand-800"
                >
                  <span className="flex-1">{option.label}</span>
                  <span aria-hidden="true" className="flex size-4 items-center justify-center">
                    <Menu.RadioItemIndicator>
                      <Check className="size-4 text-brand-700" strokeWidth={3} />
                    </Menu.RadioItemIndicator>
                  </span>
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}

/* ── Filters ──────────────────────────────────────────────────────────────── */

type FiltersControlProps = {
  view: ListingView
  kind: KindKey
  /** Result count of the active view under the filters applied now; null while that is being replaced. */
  total: number | null
  onApply: (kind: KindKey) => void
}

/**
 * Seller-type filter. Choices are held in a draft until "Show results", so a
 * visitor can change their mind without a server round trip per tap.
 */
export function FiltersControl({ view, kind, total, onApply }: FiltersControlProps) {
  const isDesktop = useIsDesktop()
  const [open, setOpen] = useState(false)
  const [draftKind, setDraftKind] = useState<KindKey>(kind)

  const activeCount = kind !== "all" ? 1 : 0
  const dirty = draftKind !== kind
  // The count is only known for the filters in the URL. Under a changed draft we
  // say "Show results" rather than quote a number we have not fetched.
  const showLabel = dirty || total === null
    ? "Show results"
    : `Show ${total.toLocaleString("en-US")} ${total === 1 ? "result" : "results"}`

  function onOpenChange(next: boolean) {
    // Reopen on what is actually applied, not on an abandoned draft.
    if (next) setDraftKind(kind)
    setOpen(next)
  }

  function apply() {
    setOpen(false)
    if (dirty) onApply(draftKind)
  }

  const label = (
    <>
      <SlidersHorizontal aria-hidden="true" className="size-4 shrink-0" />
      <span className="max-sm:sr-only">Filters</span>
      {activeCount > 0 ? (
        <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-brand-700 text-[0.6875rem] font-bold tabular-nums text-white transition-[opacity,scale] duration-160 ease-(--ease-out) starting:scale-50 starting:opacity-0">
          {activeCount}
          <span className="sr-only"> active</span>
        </span>
      ) : null}
    </>
  )

  const fields = <KindFields value={draftKind} onChange={setDraftKind} />
  const actions = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={draftKind === "all"}
        onClick={() => {
          setDraftKind("all")
          haptic("tap")
        }}
        className="inline-flex h-12 shrink-0 items-center justify-center rounded-full border border-ink-200 bg-white px-5 text-sm font-bold text-ink-800 transition-[background-color,border-color,opacity,scale] duration-140 ease-(--ease-out) hover:bg-ink-50 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:pointer-events-none disabled:opacity-50 motion-reduce:active:scale-100"
      >
        Reset
      </button>
      <button type="button" className="btn-tactile flex-1" onClick={apply}>
        {showLabel}
      </button>
    </div>
  )

  if (isDesktop) {
    return (
      <Popover.Root open={open} onOpenChange={onOpenChange}>
        <Popover.Trigger className={triggerClass(activeCount > 0)}>{label}</Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner side="bottom" align="end" sideOffset={8} className="isolate z-50">
            <Popover.Popup className={cn(popupMotion, popupSurface, "w-80 p-4")}>
              <Popover.Title className="sr-only">Filters</Popover.Title>
              {fields}
              <div className="mt-4">{actions}</div>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        aria-haspopup="dialog"
        className={triggerClass(activeCount > 0)}
      >
        {label}
      </button>

      <GlassSheet
        open={open}
        onOpenChange={onOpenChange}
        title="Filters"
        description={view === "products" ? "Products in this category" : "Sellers in this category"}
        footer={actions}
      >
        <div className="pt-1">{fields}</div>
      </GlassSheet>
    </>
  )
}

function KindFields({ value, onChange }: { value: KindKey; onChange: (kind: KindKey) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-ink-900">Seller type</legend>
      <div role="radiogroup" aria-label="Seller type" className="grid gap-2">
        {KIND_OPTIONS.map((option) => (
          <OptionRow
            key={option.value}
            label={option.label}
            selected={value === option.value}
            onSelect={() => onChange(option.value)}
          />
        ))}
      </div>
    </fieldset>
  )
}

/* ── Shared row ───────────────────────────────────────────────────────────── */

function OptionRow({
  label,
  selected,
  onSelect,
}: {
  label: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => {
        haptic("tap")
        onSelect()
      }}
      className={cn(
        "flex min-h-12 w-full items-center gap-3 rounded-xl border px-4 text-left text-[0.9375rem] font-semibold transition-[background-color,border-color,color,scale] duration-140 ease-(--ease-out) active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 motion-reduce:active:scale-100",
        selected
          ? "border-brand-600 bg-brand-50 text-brand-800"
          : "border-ink-200 bg-white text-ink-800 hover:border-ink-300 hover:bg-ink-50",
      )}
    >
      <span className="min-w-0 flex-1">{label}</span>
      <span
        aria-hidden="true"
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-[background-color,border-color] duration-160 ease-(--ease-out)",
          selected ? "border-brand-600 bg-brand-600 text-white" : "border-ink-300",
        )}
      >
        <Check
          className={cn(
            "size-3.5 transition-[opacity,scale] duration-160 ease-(--ease-out)",
            selected ? "scale-100 opacity-100" : "scale-75 opacity-0",
          )}
          strokeWidth={3}
        />
      </span>
    </button>
  )
}

"use client"

import * as React from "react"
import {
  ArrowRight,
  Check,
  Eye,
  Layers,
  MapPin,
  Package,
  Play,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Truck,
} from "lucide-react"

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import {
  GetQuoteForm,
  QUOTE_FORM_SCREEN_COUNT,
} from "@/components/marketplace/GetQuoteForm"
import { MediaImage } from "@/components/marketplace/MediaImage"
import { GuidedShell } from "@/components/marketplace/wizard/GuidedShell"
import { ROUTES } from "@/config/routes.config"
import { haptic } from "@/lib/celebrate"
import {
  marketplaceService,
  type TreeCategory,
  type TreeDepartment,
} from "@/services/marketplace.service"
import type { Supplier } from "@/types/marketplace.types"
import { cn } from "@/lib/utils"

type Step = 1 | 2 | 3 | 4

/** Screens before the form: department, category, sellers. */
const PICK_SCREENS = 3
/** One progress bar across the picks and every question of the form. */
const TOTAL_SCREENS = PICK_SCREENS + QUOTE_FORM_SCREEN_COUNT

type Props = {
  tree: TreeDepartment[]
  initial?: { dept?: string; cat?: string }
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export function QuoteWizard({ tree, initial }: Props) {
  // ── Resolve a deep-linked starting point from the tree ───────────────────────
  const start = React.useMemo(() => {
    const dept = tree.find((d) => d.slug === initial?.dept)
    const cat = dept?.categories.find((c) => c.slug === initial?.cat)
    if (cat) return { step: 3 as Step, dept, cat }
    if (dept) return { step: 2 as Step, dept, cat: undefined }
    return { step: 1 as Step, dept: undefined, cat: undefined }
  }, [tree, initial?.dept, initial?.cat])

  const [step, setStep] = React.useState<Step>(start.step)
  // Screens already visited, so Back honours auto-skipped levels.
  const history = React.useRef<Step[]>(
    start.step === 1 ? [] : ([1, 2, 3] as Step[]).filter((s) => s < start.step),
  )
  const [dept, setDept] = React.useState<TreeDepartment | undefined>(start.dept)
  const [cat, setCat] = React.useState<TreeCategory | undefined>(start.cat)
  const [selectedSupplierIds, setSelectedSupplierIds] = React.useState<string[]>([])

  const [suppliers, setSuppliers] = React.useState<Supplier[]>([])
  const [suppliersState, setSuppliersState] = React.useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  )

  // ── Navigation (auto-skips single-child levels, back respects skips) ─────────
  function advanceTo(target: Step) {
    // A double tap must not record the same screen twice.
    if (history.current[history.current.length - 1] !== step) history.current.push(step)
    setStep(target)
  }

  function pickDepartment(d: TreeDepartment) {
    haptic("tap")
    if (dept?.slug !== d.slug) {
      setDept(d)
      setCat(undefined)
    }
  }

  function continueFromDepartment() {
    if (!dept) return
    if (dept.categories.length === 1) {
      setCat(dept.categories[0])
      advanceTo(3)
    } else advanceTo(2)
  }

  function pickCategory(c: TreeCategory) {
    haptic("tap")
    setCat(c)
  }

  function back() {
    const last = history.current.pop()
    if (last != null) setStep(last)
  }

  // ── Load suppliers when a category is chosen ─────────────────────────────────
  const catSlug = cat?.slug
  React.useEffect(() => {
    if (!catSlug) return
    const slug = catSlug
    let cancelled = false
    async function load() {
      setSuppliersState("loading")
      setSelectedSupplierIds([])
      try {
        const res = await marketplaceService.listSuppliers({ category: slug, limit: 48 })
        if (cancelled) return
        setSuppliers(res.data)
        setSuppliersState("ready")
      } catch {
        if (cancelled) return
        setSuppliers([])
        setSuppliersState("error")
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [catSlug])

  function toggleSupplier(id: string) {
    haptic("tap")
    setSelectedSupplierIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    )
  }

  const selectedSupplierNames = suppliers
    .filter((s) => selectedSupplierIds.includes(s.id))
    .map((s) => s.name)

  // ── Step 4: the request form, one question per screen ────────────────────────
  if (step === 4 && cat) {
    return (
      <GetQuoteForm
        guided="always"
        mode="batch"
        supplierIds={selectedSupplierIds}
        redirectOnSuccess
        progress={{ offset: PICK_SCREENS, total: TOTAL_SCREENS }}
        onExit={back}
        context={{
          categorySlug: cat.slug,
          categoryName: cat.name,
          supplierName: selectedSupplierNames.join(", ") || undefined,
        }}
      />
    )
  }

  // ── Steps 1 to 3: pick what, which type, which sellers ───────────────────────
  if (step === 1) {
    return (
      <GuidedShell
        step={0}
        total={TOTAL_SCREENS}
        bubble="Hi, I am your Alivia guide. What do you need today?"
        backHref={ROUTES.MARKETPLACE}
        backLabel="Back to marketplace"
        action={(placement, { guard }) => (
          <ContinueButton
            placement={placement}
            enabled={Boolean(dept)}
            popOnUnlock
            onClick={guard(() => {
              haptic("tap")
              continueFromDepartment()
            })}
          />
        )}
      >
        <h2 className="font-heading text-xl font-semibold text-ink-900">
          What are you looking for?
        </h2>
        <p className="mt-0.5 text-sm text-ink-600">Tap one to get started.</p>
        <ul className="mt-3 grid gap-2.5">
          {tree.map((d) => (
            <li key={d.slug}>
              <ChoiceTile
                title={d.name}
                description={d.description}
                meta={`${d.categories.length} categories`}
                iconUrl={d.iconUrl}
                fallbackIcon={<Layers className="size-5" />}
                selected={dept?.slug === d.slug}
                onSelect={() => pickDepartment(d)}
              />
            </li>
          ))}
        </ul>
      </GuidedShell>
    )
  }

  if (step === 2 && dept) {
    return (
      <GuidedShell
        step={1}
        total={TOTAL_SCREENS}
        bubble={`Nice choice. Which type of ${dept.name} do you need?`}
        onBack={back}
        action={(placement, { guard }) => (
          <ContinueButton
            placement={placement}
            enabled={Boolean(cat)}
            popOnUnlock
            onClick={guard(() => {
              if (!cat) return
              haptic("tap")
              advanceTo(3)
            })}
          />
        )}
      >
        <h2 className="font-heading text-xl font-semibold text-ink-900">
          Pick a type in {dept.name}
        </h2>
        <p className="mt-0.5 text-sm text-ink-600">Narrow down to the product group you need.</p>
        <ul className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {dept.categories.map((c) => (
            <li key={c.slug}>
              <ChoiceTile
                compact
                title={c.name}
                description={c.description}
                iconUrl={c.iconUrl}
                fallbackIcon={<Package className="size-5" />}
                selected={cat?.slug === c.slug}
                onSelect={() => pickCategory(c)}
              />
            </li>
          ))}
        </ul>
      </GuidedShell>
    )
  }

  if (step === 3 && cat) {
    const loading = suppliersState === "loading" || suppliersState === "idle"
    return (
      <GuidedShell
        step={2}
        total={TOTAL_SCREENS}
        mood={loading ? "think" : "idle"}
        bubble={
          loading
            ? "One moment while I find sellers for you."
            : suppliers.length === 0
              ? "No sellers listed here yet, but I can still match you. Just continue."
              : "Pick the sellers you like, or skip and I will match you with verified ones."
        }
        onBack={back}
        action={(placement, { guard }) => (
          <ContinueButton
            placement={placement}
            label={selectedSupplierIds.length > 0 ? `Continue (${selectedSupplierIds.length})` : "Skip, match me"}
            onClick={guard(() => {
              haptic("tap")
              advanceTo(4)
            })}
          />
        )}
      >
        <h2 className="font-heading text-xl font-semibold text-ink-900">
          Choose sellers for {cat.name}
        </h2>
        <p className="mt-0.5 text-sm text-ink-600">
          Select one or more, or skip and let Alivia match you.
        </p>

        <div className="mt-3">
          <SupplierStep
            state={suppliersState}
            suppliers={suppliers}
            selectedIds={selectedSupplierIds}
            onToggle={toggleSupplier}
            onSelectAll={() => setSelectedSupplierIds(suppliers.map((s) => s.id))}
            onClear={() => setSelectedSupplierIds([])}
          />
        </div>

        <p className="mt-4 text-sm text-ink-600" aria-live="polite">
          {selectedSupplierIds.length > 0
            ? `${selectedSupplierIds.length} seller${selectedSupplierIds.length === 1 ? "" : "s"} selected`
            : "No sellers selected. We will route your request to verified matches."}
        </p>
      </GuidedShell>
    )
  }

  return null
}

// ─── Pieces ────────────────────────────────────────────────────────────────────

/** The single full-width action of a screen. It pops when it unlocks. */
function ContinueButton({
  placement,
  enabled = true,
  popOnUnlock = false,
  label = "Continue",
  onClick,
}: {
  placement: "bar" | "inline"
  enabled?: boolean
  /** Replay the card-pop on the button the moment it becomes available. */
  popOnUnlock?: boolean
  label?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={!enabled}
      onClick={onClick}
      className={cn(
        "btn-tactile",
        placement === "bar" ? "flex-1" : "min-w-56",
        popOnUnlock &&
          enabled &&
          "animate-[choice-pop_280ms_cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:animate-none",
      )}
    >
      {label}
      <ArrowRight aria-hidden="true" className="size-4" />
    </button>
  )
}

/** A round check that fills when its card is chosen. */
function CheckDot({ selected, className }: { selected: boolean; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
        selected ? "border-brand-600 bg-brand-600 text-white" : "border-ink-300 text-transparent",
        className,
      )}
    >
      <Check className={cn("size-3.5", selected && "anim-pop-in")} strokeWidth={3} />
    </span>
  )
}

function ChoiceTile({
  title,
  description,
  meta,
  iconUrl,
  fallbackIcon,
  selected,
  compact = false,
  onSelect,
}: {
  title: string
  description?: string | null
  meta?: string
  iconUrl?: string | null
  fallbackIcon: React.ReactNode
  selected: boolean
  /** Half-width tile: icon and name only. */
  compact?: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn("choice-card relative h-full", compact && "!min-h-16 !gap-2.5 !px-2.5 !py-2")}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-50 text-brand-700",
          compact ? "size-10" : "size-11",
        )}
      >
        <MediaImage
          src={iconUrl}
          alt=""
          width={44}
          height={44}
          unoptimized
          className="size-full object-cover"
          fallback={fallbackIcon}
        />
      </span>
      <span className={cn("min-w-0 flex-1", compact && "pr-3")}>
        <span className={cn("block font-bold leading-tight", compact ? "line-clamp-2 text-[0.8125rem]" : "text-[0.9375rem]")}>
          {title}
        </span>
        {description && !compact ? (
          <span className="mt-0.5 line-clamp-1 block text-xs font-medium text-ink-500">
            {description}
          </span>
        ) : null}
      </span>
      {meta && !compact ? (
        <span className="hidden shrink-0 text-xs font-semibold text-ink-500 min-[400px]:block">{meta}</span>
      ) : null}
      {compact ? (
        <CheckDot selected={selected} className="absolute right-1.5 top-1.5 size-5" />
      ) : (
        <CheckDot selected={selected} />
      )}
    </button>
  )
}

function SupplierStep({
  state,
  suppliers,
  selectedIds,
  onToggle,
  onSelectAll,
  onClear,
}: {
  state: "idle" | "loading" | "ready" | "error"
  suppliers: Supplier[]
  selectedIds: string[]
  onToggle: (id: string) => void
  onSelectAll: () => void
  onClear: () => void
}) {
  const [videoOf, setVideoOf] = React.useState<Supplier | null>(null)

  if (state === "loading" || state === "idle") {
    return (
      <div className="grid gap-2.5 sm:grid-cols-2" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-24 rounded-2xl border border-border/60 bg-ink-50/60" />
        ))}
      </div>
    )
  }

  if (suppliers.length === 0) {
    return (
      <EmptyNote text="No verified sellers listed here yet. Continue and our marketplace team will return vetted matches within 24 hours." />
    )
  }

  return (
    <>
      <div className="mb-2 flex items-center gap-1 text-xs">
        <button
          type="button"
          onClick={onSelectAll}
          className="min-h-9 rounded-full px-2 font-semibold text-brand-700 hover:underline"
        >
          Select all ({suppliers.length})
        </button>
        {selectedIds.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="min-h-9 rounded-full px-2 font-medium text-ink-500 hover:text-ink-800"
          >
            Clear
          </button>
        )}
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {suppliers.map((s) => (
          <SupplierSelectCard
            key={s.id}
            s={s}
            checked={selectedIds.includes(s.id)}
            onToggle={() => onToggle(s.id)}
            onPlay={() => setVideoOf(s)}
          />
        ))}
      </div>

      {/* Seller video lightbox */}
      <Dialog
        open={!!videoOf}
        onOpenChange={(open) => {
          if (!open) setVideoOf(null)
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogTitle>{videoOf?.name}: product video</DialogTitle>
          {videoOf?.videoUrl ? (
            <video
              key={videoOf.id}
              src={videoOf.videoUrl}
              controls
              autoPlay
              playsInline
              className="aspect-video w-full rounded-lg bg-black"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}

function hashId(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return h
}

function formatCompact(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`
  return String(n)
}

function SupplierSelectCard({
  s,
  checked,
  onToggle,
  onPlay,
}: {
  s: Supplier
  checked: boolean
  onToggle: () => void
  onPlay: () => void
}) {
  const thumb = s.coverImage ?? s.gallery?.[0] ?? s.logo ?? undefined

  // Simulated "live viewers": deterministic initial value (SSR-safe) that gently
  // fluctuates client-side for a real-time feel. No backend tracking required.
  const [live, setLive] = React.useState(() => 6 + (hashId(s.id) % 26))
  React.useEffect(() => {
    const t = setInterval(() => {
      setLive((v) => Math.min(60, Math.max(3, v + (Math.floor(Math.random() * 5) - 2))))
    }, 4000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="relative">
      {/* The whole row selects; the video button below is a sibling, not nested. */}
      <button
        type="button"
        aria-pressed={checked}
        onClick={onToggle}
        className="choice-card !items-start !gap-3 !p-2.5 !pr-11"
      >
        <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-brand-100">
          <MediaImage
            src={thumb}
            alt=""
            fill
            unoptimized
            sizes="56px"
            className="object-cover"
            fallback={
              <span className="flex size-full items-center justify-center font-heading text-base font-bold text-brand-600/60">
                {initials(s.name)}
              </span>
            }
          />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1">
            <span className="truncate text-[0.9375rem] font-bold leading-tight">{s.name}</span>
            {s.isVerified ? (
              <ShieldCheck aria-label="Verified" className="size-3.5 shrink-0 text-brand-600" />
            ) : null}
          </span>
          <span className="mt-0.5 flex items-center gap-1 text-xs font-medium text-ink-500">
            <MapPin aria-hidden="true" className="size-3 shrink-0" />
            <span className="truncate">{s.location}</span>
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs font-medium text-ink-600">
            {s.rating > 0 ? (
              <span className="inline-flex items-center gap-0.5">
                <Star aria-hidden="true" className="size-3 fill-gold-400 text-gold-400" />
                {s.rating.toFixed(1)} ({s.reviewCount})
              </span>
            ) : null}
            {typeof s.itemsSold === "number" && s.itemsSold > 0 ? (
              <span className="inline-flex items-center gap-0.5">
                <ShoppingBag aria-hidden="true" className="size-3" />
                {formatCompact(s.itemsSold)} sold
              </span>
            ) : null}
            {s.deliveryDays ? (
              <span className="inline-flex items-center gap-0.5">
                <Truck aria-hidden="true" className="size-3" />
                {s.deliveryDays}d delivery
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1 text-ink-500">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75 motion-reduce:hidden" />
                <span className="relative inline-flex size-1.5 rounded-full bg-green-500" />
              </span>
              <Eye aria-hidden="true" className="size-3" />
              {live} watching
            </span>
          </span>
          {s.priceRange ? (
            <span className="mt-1 block truncate text-[0.8125rem] font-extrabold text-gold-700">
              {s.priceRange}
            </span>
          ) : null}
        </span>
      </button>

      <CheckDot
        selected={checked}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
      />

      {s.videoUrl ? (
        <button
          type="button"
          onClick={onPlay}
          aria-label={`Play ${s.name} video`}
          className="absolute left-3 top-3 flex size-14 items-center justify-center rounded-xl"
        >
          <span className="flex size-7 items-center justify-center rounded-full bg-white/90 text-brand-700 shadow">
            <Play aria-hidden="true" className="size-3.5 translate-x-px fill-current" />
          </span>
        </button>
      ) : null}
    </div>
  )
}

function EmptyNote({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-dashed border-border bg-ink-50/50 p-4 text-sm text-ink-600">
      <Sparkles aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand-600" />
      <p>{text}</p>
    </div>
  )
}

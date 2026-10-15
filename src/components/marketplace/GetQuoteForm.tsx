"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { useForm, useWatch, type FieldErrors } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Circle,
  Loader2,
  SendHorizontal,
  TriangleAlert,
} from "lucide-react"
import { motion } from "motion/react"

import { GuideAvatar } from "@/components/common/guide-avatar"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

import { AttachmentUploader } from "@/components/marketplace/AttachmentUploader"
import { GuidedShell } from "@/components/marketplace/wizard/GuidedShell"
import { ROUTES } from "@/config/routes.config"
import { celebrate, haptic, prefersReducedMotion } from "@/lib/celebrate"
import { springs } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { quoteItemsSchema, quoteSchema, type QuoteFormValues } from "@/schemas/quote.schema"
import { quotesService } from "@/services/quotes.service"
import { ApiError } from "@/services/http-client"
import type {
  CategoryAttribute,
  CategoryVariant,
  ProductVariant,
  SpecValue,
} from "@/types/marketplace.types"
import type { CreateQuoteInput, QuoteAttachment, QuoteSpec } from "@/types/quote.types"

export type QuoteContext = {
  supplierId?: string
  supplierName?: string
  productId?: string
  productName?: string
  variantId?: string
  variantName?: string
  /** Supplier product variants (when quoting a specific product). */
  variants?: ProductVariant[]
  categorySlug?: string
  categoryName?: string
  /** Admin-configured variants for the sub-category (RFQ-level quote). */
  categoryVariants?: CategoryVariant[]
  /** Admin-configured spec fields buyers fill in for the sub-category. */
  categoryAttributes?: CategoryAttribute[]
  /** Prefill for the quantity / unit fields (e.g. the product page's qty stepper). */
  quantity?: number
  unit?: string
}

/** One product in an "items" request (the quote list): sent as its own quote. */
export type QuoteItemRequest = {
  productId: string
  name: string
  quantity: number
  unit?: string
  supplierId?: string
}

/**
 * sent: confirmed by the server. failed: the server answered with an error, so
 * nothing was created and a resend is safe. unconfirmed: no answer (connection
 * lost or timed out), so the quote may exist: held back until the buyer asks to
 * resend. skipped: never tried because the run stopped at a lost connection.
 */
type ItemRunStatus = "waiting" | "sending" | "sent" | "failed" | "unconfirmed" | "skipped"
type ItemRun = QuoteItemRequest & {
  status: ItemRunStatus
  error?: string
  /** Unconfirmed only: the buyer chose "Send again", so the next send includes it. */
  resend?: boolean
  /** Held back from an earlier run and shown again; not part of this run's count. */
  carried?: boolean
}

type Props = {
  context?: QuoteContext
  /** Called on successful submit (single-quote id, or batchId in batch mode) */
  onSuccess?: (quoteId: string) => void
  /** Show a header (used in dialog vs. standalone page contexts differently) */
  showHeader?: boolean
  /** When true, redirects to the thank-you page on success */
  redirectOnSuccess?: boolean
  /**
   * Batch mode (wizard): the selected supplier ids. When provided the form
   * submits to the batch endpoint (one quote per supplier; empty = match me).
   */
  supplierIds?: string[]
  /**
   * "items" (the quote list): the contact and delivery fields once, then one
   * request per product in `items`, sent one after another with progress.
   */
  mode?: "single" | "batch" | "items"
  /** Items mode: the products to request (each carries its own qty, unit, seller). */
  items?: QuoteItemRequest[]
  /**
   * Items mode: called the moment one product's request is confirmed, so the
   * host drops it from its list right away. The list then only ever holds
   * what is not sent yet: a reload or an interrupted run cannot resend it.
   */
  onItemSent?: (productId: string) => void
  /**
   * Items mode: every request is confirmed and nothing is held back (with
   * redirectOnSuccess the page is already navigating to the thank-you page).
   */
  onAllItemsSent?: () => void
  /** Offer the file-attachment field (logged-in buyers only). Default true. */
  enableAttachments?: boolean
  className?: string
  /**
   * One question per screen with a progress bar and the Alivia guide.
   * "phones": guided below md, the classic single form from md up.
   * "always": guided at every width (the wizard).
   */
  guided?: "phones" | "always"
  /** Where this form sits in a longer flow (the wizard's picks come first). */
  progress?: { offset: number; total: number }
  /** Back from the first screen: a handler (wizard) or a link (quote page). */
  onExit?: () => void
  exitHref?: string
  /** id for the <form>, so a sheet footer can submit it with `form={id}`. */
  formId?: string
  /**
   * Hide the inline submit row (the host renders its own button). "phones"
   * hides it below md only (the host's MobileActionBar submits there).
   */
  hideSubmit?: boolean | "phones"
  onSubmittingChange?: (submitting: boolean) => void
  /** Called when the visitor chooses "Submit another request" on the success view. */
  onReset?: () => void
}

// Variant picker + dynamic spec fields are disabled for now: quote requests are
// kept to contact + requirement only and the support team follows up on variant /
// size / finish details after the quote is created. Flip to `true` to re-enable
// both the UI and the variant/spec payload.
const ENABLE_VARIANTS_SPECS = false

/** Compact summary of a product variant's generic spec values. */
function specDetail(specs?: SpecValue[] | null) {
  if (!specs?.length) return ""
  return specs
    .map((spec) => `${spec.value}${spec.unit ? ` ${spec.unit}` : ""}`)
    .filter(Boolean)
    .join(" / ")
}

type VariantOption = { id: string; name: string; unit?: string | null; detail?: string }

type ScreenId = "options" | "need" | "qty" | "where" | "when" | "who" | "note"

type ScreenMeta = {
  id: ScreenId
  /** The one question this screen asks. */
  title: string
  /** What the guide says (short, friendly, no dashes). */
  bubble: string
  /** Form fields that belong to this screen (validated on Continue). */
  fields: (keyof QuoteFormValues)[]
}

const SCREEN_META: Record<ScreenId, ScreenMeta> = {
  options: {
    id: "options",
    title: "Which option fits?",
    bubble: "Pick the option that fits best. Sellers will price exactly that.",
    fields: ["variantId"],
  },
  need: {
    id: "need",
    title: "What do you need?",
    bubble: "Tell me what you need. A few words are enough.",
    fields: ["message"],
  },
  qty: {
    id: "qty",
    title: "How much do you need?",
    bubble: "Add a quantity if you know it. You can skip this.",
    fields: ["quantity", "unit"],
  },
  where: {
    id: "where",
    title: "Where should it go?",
    bubble: "Where should it be delivered? Sellers use this to plan.",
    fields: ["deliveryLocation"],
  },
  when: {
    id: "when",
    title: "When do you need it?",
    bubble: "Pick a date if you have one. Skip it if you are flexible.",
    fields: ["deliveryDate"],
  },
  who: {
    id: "who",
    title: "How can sellers reach you?",
    bubble: "Last step. Sellers will contact you on these details.",
    fields: ["name", "phone", "email", "company"],
  },
  // Items mode only: what each product needs is already in the list, so the
  // free-text requirement becomes an optional note sent with every item.
  note: {
    id: "note",
    title: "Anything sellers should know?",
    bubble: "Add a note if it helps. Sizes, colours or site access help sellers price it right.",
    fields: ["message"],
  },
}

/** The ask each seller reads for one product, plus the buyer's shared note. */
function itemMessage(item: QuoteItemRequest, note: string) {
  const amount = `${item.quantity}${item.unit ? ` ${item.unit}` : ""}`
  const ask = `Please quote ${amount} of ${item.name}.`
  return note ? `${ask}\n\n${note}` : ask
}

function errorText(err: unknown) {
  return err instanceof ApiError || err instanceof Error
    ? err.message
    : "Could not submit your request. Please try again."
}

/** Items mode: give up waiting on one request after this long (it may still land). */
const ITEM_TIMEOUT_MS = 20_000

/** Products not confirmed by an earlier run that the buyer has not asked to resend. */
function heldBackIds(run: ItemRun[] | null) {
  return new Set(
    (run ?? [])
      .filter((entry) => entry.status === "unconfirmed" && !entry.resend)
      .map((entry) => entry.productId),
  )
}

/** What happened in an items run that did not fully go through, in plain words. */
function runSummary(outcome: {
  sent: number
  failed: number
  skipped: number
  lost: { name: string; timedOut: boolean } | null
}) {
  const { sent, failed, skipped, lost } = outcome
  const parts: string[] = []
  if (lost) {
    parts.push(
      `${lost.timedOut ? "The server did not reply in time" : "The connection dropped"}, so ${lost.name} is not confirmed. It may have reached the seller, so check before sending it again.`,
    )
  }
  if (skipped) {
    // Only after a lost answer: the run stops there (the rest would fail the same way).
    parts.push(
      `${skipped === 1 ? "1 item was" : `${skipped} items were`} not sent yet. ${lost?.timedOut ? "Send again in a moment." : "Send again when your connection is back."}`,
    )
  }
  if (failed) {
    parts.push(
      sent === 0 && !lost
        ? "None of your requests were sent. The reason is under each item."
        : `${failed === 1 ? "1 request was" : `${failed} requests were`} not sent. The reason is under each item.`,
    )
  }
  return parts.join(" ")
}

function subscribePhone(onChange: () => void) {
  const mq = window.matchMedia("(max-width: 767px)")
  mq.addEventListener("change", onChange)
  return () => mq.removeEventListener("change", onChange)
}
function getIsPhone() {
  return window.matchMedia("(max-width: 767px)").matches
}

/** Guided screens a form with no variant/spec options shows. */
export const QUOTE_FORM_SCREEN_COUNT = 5

/** Guided fields are 48px; in "phones" mode they return to the default size from md. */
const GUIDED_FIELD_PHONES = "h-12 text-base md:h-10 lg:h-8 lg:text-sm"
const GUIDED_FIELD_ALWAYS = "h-12 text-base"
/** Items mode is a classic form on phones too (the quote list page): 44px fields there. */
const ITEMS_FIELD = "h-11 md:h-10"

/** Exponential ease-out (globals.css --ease-out) for motion props. */
const EASE_OUT = [0.23, 1, 0.32, 1] as const

function RunIcon({ status }: { status: ItemRunStatus }) {
  switch (status) {
    case "waiting":
    case "skipped":
      return <Circle aria-hidden="true" className="size-4 text-ink-300" />
    case "sending":
      return <Loader2 aria-hidden="true" className="size-4 text-brand-600 motion-safe:animate-spin" />
    case "sent":
      return <CheckCircle2 aria-hidden="true" className="size-4 text-green-600" />
    case "failed":
      return <AlertCircle aria-hidden="true" className="size-4 text-destructive" />
    case "unconfirmed":
      return <TriangleAlert aria-hidden="true" className="size-4 text-amber-600" />
  }
}

const RUN_LABEL: Record<ItemRunStatus, string> = {
  waiting: "Waiting",
  sending: "Sending...",
  sent: "Sent to the seller",
  failed: "Not sent",
  unconfirmed: "Not confirmed. It may have reached the seller",
  skipped: "Not sent yet",
}

function runHeadline(run: ItemRun[]) {
  const current = run.filter((entry) => !entry.carried)
  const sent = current.filter((entry) => entry.status === "sent").length
  const pending = current.filter(
    (entry) => entry.status === "waiting" || entry.status === "sending",
  ).length
  if (pending > 0) return `Sending ${current.length - pending + 1} of ${current.length}...`
  return sent === current.length ? "All requests sent" : `${sent} of ${current.length} sent`
}

export function GetQuoteForm({
  context,
  onSuccess,
  showHeader = false,
  redirectOnSuccess = false,
  supplierIds,
  mode = "single",
  items,
  onItemSent,
  onAllItemsSent,
  enableAttachments = true,
  className,
  guided,
  progress,
  onExit,
  exitHref,
  formId,
  hideSubmit = false,
  onSubmittingChange,
  onReset,
}: Props) {
  const { data: session } = useSession()
  const [submitState, setSubmitState] = React.useState<
    | { status: "idle" }
    | { status: "submitting" }
    | { status: "success"; quoteId: string; email: string }
    | { status: "error"; message: string }
  >({ status: "idle" })
  const [screenIndex, setScreenIndex] = React.useState(0)
  const isPhone = React.useSyncExternalStore(subscribePhone, getIsPhone, () => false)
  const uid = React.useId()

  // Buyer answers to the sub-category's spec fields, keyed by attribute key.
  const [specValues, setSpecValues] = React.useState<Record<string, string>>({})
  const [specErrors, setSpecErrors] = React.useState<Record<string, boolean>>({})
  const [attachments, setAttachments] = React.useState<QuoteAttachment[]>([])
  // Items mode: per-product progress of the last run (null before the first send).
  const [itemRun, setItemRun] = React.useState<ItemRun[] | null>(null)
  // Items mode sends real requests to sellers one by one: a second submit while
  // a run is in flight (double tap before "Sending..." renders) must not start another.
  const itemsInFlight = React.useRef(false)
  const runRef = React.useRef<HTMLDivElement>(null)
  // Bumped on every items send attempt, so the progress list scrolls into view each time.
  const [runSeq, setRunSeq] = React.useState(0)
  // Across runs on this page: what the thank-you page reports once everything is in.
  const reached = React.useRef({ requests: 0, sellers: new Set<string>() })
  const itemsMode = mode === "items"

  // Spec fields + variant choices: disabled via ENABLE_VARIANTS_SPECS (see top).
  // When off, both arrays stay empty so nothing renders and nothing is sent.
  const attributes = ENABLE_VARIANTS_SPECS
    ? (context?.categoryAttributes ?? []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : []

  // Variant choices: a specific product's variants take precedence; otherwise
  // the sub-category's admin-configured variants drive the picker.
  const variantOptions: VariantOption[] = !ENABLE_VARIANTS_SPECS
    ? []
    : context?.variants?.length
      ? context.variants
          .filter((v) => v.isActive !== false)
          .map((v) => ({ id: v.id, name: v.name, unit: v.unit, detail: specDetail(v.specs) }))
      : (context?.categoryVariants ?? [])
          .filter((v) => v.isActive !== false)
          .map((v) => ({ id: v.id, name: v.name, unit: v.unit, detail: v.description ?? "" }))

  const screens: ScreenMeta[] = itemsMode
    ? // Quantity and unit come from each item; the requirement is an optional note.
      [SCREEN_META.where, SCREEN_META.when, SCREEN_META.who, SCREEN_META.note]
    : [
        ...(variantOptions.length > 0 || attributes.length > 0 ? [SCREEN_META.options] : []),
        SCREEN_META.need,
        SCREEN_META.qty,
        SCREEN_META.where,
        SCREEN_META.when,
        SCREEN_META.who,
      ]
  const lastScreen = screens.length - 1
  const current = screens[Math.min(screenIndex, lastScreen)]

  const form = useForm<QuoteFormValues>({
    // Items mode: the note is optional (each item already says what is needed).
    resolver: itemsMode ? zodResolver(quoteItemsSchema) : zodResolver(quoteSchema),
    defaultValues: {
      supplierId: context?.supplierId,
      productId: context?.productId,
      variantId: context?.variantId,
      categorySlug: context?.categorySlug,
      name: "",
      email: "",
      phone: "",
      company: "",
      city: "",
      deliveryLocation: "",
      quantity: context?.quantity,
      unit: context?.unit ?? "",
      deliveryDate: "",
      message: "",
    },
  })

  // Keep hidden context fields in sync if props change
  React.useEffect(() => {
    if (context?.supplierId) form.setValue("supplierId", context.supplierId)
    if (context?.productId) form.setValue("productId", context.productId)
    if (context?.variantId) form.setValue("variantId", context.variantId)
    if (context?.categorySlug) form.setValue("categorySlug", context.categorySlug)
  }, [context?.supplierId, context?.productId, context?.variantId, context?.categorySlug, form])

  const selectedVariantId = useWatch({ control: form.control, name: "variantId" })
  const selectedVariant = variantOptions.find((v) => v.id === selectedVariantId)
  const values = useWatch({ control: form.control })

  React.useEffect(() => {
    if (selectedVariant?.unit) form.setValue("unit", selectedVariant.unit)
  }, [form, selectedVariant?.unit])

  React.useEffect(() => {
    if (session?.user?.name && !form.getValues("name")) {
      form.setValue("name", session.user.name)
    }
    if (session?.user?.email && !form.getValues("email")) {
      form.setValue("email", session.user.email)
    }
  }, [form, session?.user?.email, session?.user?.name])

  const submitting = submitState.status === "submitting"
  React.useEffect(() => {
    onSubmittingChange?.(submitting)
  }, [submitting, onSubmittingChange])

  // Items mode: bring the progress list (or the message) into view on every send
  // attempt (the send button may be the phone's bottom bar, far from the list).
  React.useEffect(() => {
    if (runSeq === 0) return
    runRef.current?.scrollIntoView({
      block: "nearest",
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    })
  }, [runSeq])

  // Coming back to this page from the thank-you page (back/forward cache)
  // restores it mid-"Sending...": put the form back to a usable state.
  React.useEffect(() => {
    function onPageShow(event: PageTransitionEvent) {
      if (!event.persisted) return
      setSubmitState({ status: "idle" })
      itemsInFlight.current = false
    }
    window.addEventListener("pageshow", onPageShow)
    return () => window.removeEventListener("pageshow", onPageShow)
  }, [])

  function setSpec(key: string, value: string) {
    setSpecValues((prev) => ({ ...prev, [key]: value }))
    setSpecErrors((prev) => (prev[key] ? { ...prev, [key]: false } : prev))
  }

  /** Variant and required-spec checks (mirror the backend). False = show errors. */
  function optionsAreValid() {
    if (variantOptions.length && !form.getValues("variantId")) {
      form.setError("variantId", { message: "Select a variant" })
      return false
    }
    const missing: Record<string, boolean> = {}
    for (const attribute of attributes) {
      if (attribute.required && !(specValues[attribute.key] ?? "").trim()) {
        missing[attribute.key] = true
      }
    }
    if (Object.keys(missing).length) {
      setSpecErrors(missing)
      return false
    }
    return true
  }

  function resetForm() {
    form.reset({ ...form.getValues(), name: "", email: "", phone: "", company: "", city: "", deliveryLocation: "", quantity: undefined, unit: "", deliveryDate: "", message: "" })
    setSpecValues({})
    setAttachments([])
    setScreenIndex(0)
  }

  /** Items mode: the buyer's "Send again" on a product that was not confirmed. */
  function toggleResend(productId: string) {
    setItemRun((run) =>
      run
        ? run.map((entry) =>
            entry.productId === productId ? { ...entry, resend: !entry.resend } : entry,
          )
        : run,
    )
  }

  /**
   * Items mode: one POST /marketplace/quotes per product (the API has no
   * multi-product quote and no idempotency key), sent one after another so
   * progress reads in order. Every request goes to a real seller, so:
   * - each confirmed product leaves the host's list at once (write-through);
   * - a request with no answer (connection lost, or no reply within
   *   ITEM_TIMEOUT_MS) may still have been created: it is held back from the
   *   next send until the buyer taps "Send again", and the run stops there;
   * - a server error means nothing was created: the product stays and is
   *   resent with the next send.
   */
  async function sendItems(values: QuoteFormValues, specs: QuoteSpec[]) {
    if (itemsInFlight.current) return
    const list = items ?? []
    const held = heldBackIds(itemRun)
    const queue = list.filter((item) => !held.has(item.productId))
    // Held-back products still in the list stay visible with their note.
    const carried: ItemRun[] = (itemRun ?? [])
      .filter((entry) => held.has(entry.productId) && list.some((item) => item.productId === entry.productId))
      .map((entry) => ({ ...entry, carried: true }))
    setRunSeq((seq) => seq + 1)

    if (!queue.length) {
      setSubmitState({
        status: "error",
        message: carried.length
          ? "What is left is not confirmed and may already be with the seller. Check with them, or tap Send again on an item to resend it."
          : "Your quote list is empty. Add a product first.",
      })
      return
    }
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setSubmitState({
        status: "error",
        message: "You are offline. Nothing was sent. Connect to the internet, then send again.",
      })
      return
    }

    itemsInFlight.current = true
    let redirecting = false
    setSubmitState({ status: "submitting" })
    try {
      // What every item shares; product, seller, quantity, unit and message are per item.
      const shared: Omit<CreateQuoteInput, "productId" | "supplierId" | "quantity" | "unit" | "message"> = {
        name: values.name,
        email: values.email,
        phone: values.phone,
        company: values.company || undefined,
        city: values.city || undefined,
        deliveryLocation: values.deliveryLocation,
        deliveryDate: values.deliveryDate || undefined,
        specs: specs.length ? specs : undefined,
        attachments: attachments.length ? attachments : undefined,
      }
      const note = (values.message ?? "").trim()

      let run: ItemRun[] = [
        ...queue.map((item): ItemRun => ({ ...item, status: "waiting" })),
        ...carried,
      ]
      const mark = (index: number, patch: Partial<ItemRun>) => {
        run = run.map((entry, i) => (i === index ? { ...entry, ...patch } : entry))
        setItemRun(run)
      }
      setItemRun(run)

      let sent = 0
      let failed = 0
      let skipped = 0
      let firstQuoteId = ""
      let lost: { name: string; timedOut: boolean } | null = null

      for (const [index, item] of queue.entries()) {
        if (lost) {
          // The connection is the problem: the rest would fail the same way.
          skipped += 1
          mark(index, { status: "skipped" })
          continue
        }
        mark(index, { status: "sending" })
        const controller = new AbortController()
        const timer = window.setTimeout(() => controller.abort(), ITEM_TIMEOUT_MS)
        let quoteId = ""
        try {
          const quote = await quotesService.create(
            {
              ...shared,
              productId: item.productId,
              supplierId: item.supplierId,
              quantity: item.quantity,
              unit: item.unit || undefined,
              message: itemMessage(item, note),
            },
            session?.accessToken,
            { signal: controller.signal },
          )
          quoteId = quote.id
        } catch (err) {
          // Status 0 = no HTTP answer (offline, dropped, or our timeout abort).
          const timedOut = controller.signal.aborted
          if (timedOut || (err instanceof ApiError && err.status === 0)) {
            lost = { name: item.name, timedOut }
            mark(index, { status: "unconfirmed", resend: false })
          } else {
            failed += 1
            mark(index, { status: "failed", error: errorText(err) })
          }
          continue
        } finally {
          window.clearTimeout(timer)
        }
        // Outside the request's try: nothing after a created quote may mark it failed.
        sent += 1
        firstQuoteId ||= quoteId
        reached.current.requests += 1
        reached.current.sellers.add(item.supplierId ?? item.productId)
        mark(index, { status: "sent" })
        onItemSent?.(item.productId)
      }

      const allIn = sent === queue.length && carried.length === 0
      if (allIn && redirectOnSuccess) {
        // `count` = sellers reached (the thank-you copy reads it as suppliers),
        // `items` = requests sent, across every run on this page. Like batch,
        // stay in "Sending..." until the thank-you page replaces this one.
        redirecting = true
        window.location.assign(
          `${ROUTES.MARKETPLACE_QUOTE_THANK_YOU}?count=${reached.current.sellers.size}&items=${reached.current.requests}`,
        )
        onAllItemsSent?.()
        return
      }
      if (allIn) {
        setItemRun(null)
        setSubmitState({ status: "success", quoteId: firstQuoteId, email: values.email })
        resetForm()
        celebrate()
        onSuccess?.(firstQuoteId)
        onAllItemsSent?.()
        return
      }
      const summary = runSummary({ sent, failed, skipped, lost })
      // Everything in this run went through; only earlier unconfirmed items remain,
      // and the list already says so under each of them.
      setSubmitState(summary ? { status: "error", message: summary } : { status: "idle" })
    } catch (err) {
      // Not from a request (those are caught per item): never leave the form stuck.
      setSubmitState({ status: "error", message: errorText(err) })
    } finally {
      if (!redirecting) itemsInFlight.current = false
    }
  }

  async function onSubmit(values: QuoteFormValues) {
    if (!optionsAreValid()) return

    const specs: QuoteSpec[] = attributes
      .map((attribute) => ({
        key: attribute.key,
        label: attribute.label,
        value: (specValues[attribute.key] ?? "").trim(),
        unit: attribute.unit ?? undefined,
      }))
      .filter((spec) => spec.value !== "")

    if (itemsMode) {
      await sendItems(values, specs)
      return
    }

    setSubmitState({ status: "submitting" })
    try {
      // Strip empty-string optional fields
      const payload = {
        ...values,
        company: values.company || undefined,
        city: values.city || undefined,
        unit: values.unit || undefined,
        deliveryDate: values.deliveryDate || undefined,
        quantity:
          values.quantity === undefined || values.quantity === ("" as unknown)
            ? undefined
            : Number(values.quantity),
        specs: specs.length ? specs : undefined,
        attachments: attachments.length ? attachments : undefined,
      }

      if (mode === "batch") {
        // One quote per selected supplier (empty list = "let Alivia match me").
        // Drop the single-target fields: the batch DTO rejects them.
        const rest = { ...payload } as Record<string, unknown>
        delete rest.supplierId
        delete rest.productId
        const result = await quotesService.createBatch(
          { ...(rest as Omit<typeof payload, "supplierId" | "productId">), supplierIds: supplierIds ?? [] },
          session?.accessToken,
        )
        if (redirectOnSuccess) {
          // Stay in "Sending..." until the thank-you page replaces this one: no
          // reset flash and no way to send twice on a slow connection.
          window.location.assign(
            `/marketplace/quote/thank-you?batch=${result.batchId}&count=${result.count}`,
          )
          return
        }
        setSubmitState({ status: "success", quoteId: result.batchId, email: values.email })
        resetForm()
        celebrate()
        onSuccess?.(result.batchId)
        return
      }

      const quote = await quotesService.create(payload, session?.accessToken)
      if (redirectOnSuccess) {
        window.location.assign(`/marketplace/quote/thank-you?id=${quote.id}`)
        return
      }
      setSubmitState({ status: "success", quoteId: quote.id, email: values.email })
      resetForm()
      celebrate()
      onSuccess?.(quote.id)
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not submit your request. Please try again."
      setSubmitState({ status: "error", message })
    }
  }

  /** True when the guided one-question-per-screen presentation is on screen right now. */
  function guidedIsActive() {
    if (guided === "always") return true
    return guided === "phones" && window.matchMedia("(max-width: 767px)").matches
  }

  /** A required screen is "ready" once its required fields hold something. */
  function screenIsFilled(id: ScreenId) {
    const filled = (value: unknown) => String(value ?? "").trim().length > 0
    switch (id) {
      case "options":
        return !variantOptions.length || filled(values.variantId)
      case "need":
        return filled(values.message)
      case "qty":
        return filled(values.quantity) || filled(values.unit)
      case "where":
        return filled(values.deliveryLocation)
      case "when":
        return filled(values.deliveryDate)
      case "who":
        return filled(values.name) && filled(values.phone) && filled(values.email)
      case "note":
        return filled(values.message)
    }
  }
  const currentRequired = current.id === "need" || current.id === "where" || current.id === "who" || current.id === "options"

  function onInvalid(errors: FieldErrors<QuoteFormValues>) {
    // A guided visitor lands on the first screen that has something to fix.
    if (!guidedIsActive()) return
    const broken = Object.keys(errors)
    const target = screens.findIndex((screen) => screen.fields.some((field) => broken.includes(field)))
    if (target >= 0) setScreenIndex(target)
  }

  async function advance() {
    if (submitting) return
    const fields = current.fields.filter((field) => field !== "variantId")
    const valid = fields.length ? await form.trigger(fields) : true
    if (!valid) return
    if (current.id === "options" && !optionsAreValid()) return

    if (screenIndex >= lastScreen) {
      await form.handleSubmit(onSubmit, onInvalid)()
      return
    }
    haptic("tap")
    setSubmitState({ status: "idle" })
    // An absolute target (not index + 1 inside an updater): a double tap on a
    // slow phone lands on the next screen once instead of skipping one.
    setScreenIndex(Math.min(screenIndex + 1, lastScreen))
  }

  function goBack() {
    if (screenIndex > 0) {
      setSubmitState({ status: "idle" })
      setScreenIndex(screenIndex - 1)
      return
    }
    onExit?.()
  }

  function onFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // Enter inside a field moves a guided visitor to the next screen instead of sending early.
    if (guidedIsActive()) void advance()
    else void form.handleSubmit(onSubmit, onInvalid)(event)
  }

  if (submitState.status === "success" && !redirectOnSuccess) {
    return (
      <div className={className}>
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-green-200 bg-green-50 p-5 text-center text-green-900">
          <GuideAvatar mood="cheer" size={64} />
          <div>
            <p className="font-heading text-lg font-semibold">Quote request sent</p>
            <p className="mt-1 text-sm text-green-800">
              Reference <span className="font-mono">{submitState.quoteId.slice(-8)}</span>. The
              supplier will contact you shortly. We have also emailed a copy to{" "}
              {submitState.email || "you"}.
            </p>
          </div>
          <button
            type="button"
            className="btn-glass"
            onClick={() => {
              setSubmitState({ status: "idle" })
              onReset?.()
            }}
          >
            Submit another request
          </button>
        </div>
      </div>
    )
  }

  const selectedVariantName = context?.variantName ?? selectedVariant?.name
  const guidedOn = Boolean(guided)
  // Slide screens only while the one-question-per-screen layout is showing.
  const slideScreens = guided === "always" || (guided === "phones" && isPhone)
  // Visible question headings only in the guided flow; elsewhere they just label the groups.
  const TitleTag = guidedOn ? "h2" : "span"
  /** Inactive screens vanish: below md in "phones" mode, everywhere in "always" mode. */
  const screenClass = (index: number) =>
    guidedOn && index !== screenIndex ? (guided === "phones" ? "max-md:hidden" : "hidden") : ""
  const legendClass = cn(
    "font-heading text-xl font-semibold leading-tight text-ink-900",
    guided === "phones" && "md:sr-only",
    !guidedOn && "sr-only",
  )

  const requestingFrom = [
    context?.productName,
    selectedVariantName,
    context?.supplierName,
    context?.categoryName,
  ]
    .filter(Boolean)
    .join(" · ")

  const fieldClass = !guidedOn
    ? itemsMode
      ? ITEMS_FIELD
      : undefined
    : guided === "phones"
      ? GUIDED_FIELD_PHONES
      : GUIDED_FIELD_ALWAYS
  const isLast = screenIndex >= lastScreen
  // Items mode: one request per product, minus those held back as not confirmed.
  const heldNow = heldBackIds(itemRun)
  const sendable = (items ?? []).filter((item) => !heldNow.has(item.productId)).length

  function renderScreen(meta: ScreenMeta) {
    switch (meta.id) {
      case "options":
        return (
          <>
            {variantOptions.length > 0 && (
              <FormField
                control={form.control}
                name="variantId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Variant *</FormLabel>
                    <FormControl>
                      <select
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        className="h-12 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:h-10"
                      >
                        <option value="">Select variant</option>
                        {variantOptions.map((variant) => (
                          <option key={variant.id} value={variant.id}>
                            {variant.name}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    {selectedVariant?.detail ? (
                      <p className="text-xs text-ink-500">{selectedVariant.detail}</p>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Dynamic spec fields configured per sub-category by admin */}
            {attributes.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {attributes.map((attribute) => {
                  const value = specValues[attribute.key] ?? ""
                  const invalid = specErrors[attribute.key]
                  const label = `${attribute.label}${attribute.unit ? ` (${attribute.unit})` : ""}${attribute.required ? " *" : ""}`
                  return (
                    <div key={attribute.id} className="grid gap-1.5">
                      <label className="text-sm font-medium text-ink-800">{label}</label>
                      {attribute.type === "SELECT" ? (
                        <select
                          aria-label={attribute.label}
                          value={value}
                          onChange={(e) => setSpec(attribute.key, e.target.value)}
                          className="h-12 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:h-10"
                        >
                          <option value="">Select...</option>
                          {(attribute.options ?? []).map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          aria-label={attribute.label}
                          type={attribute.type === "NUMBER" ? "number" : "text"}
                          value={value}
                          onChange={(e) => setSpec(attribute.key, e.target.value)}
                          placeholder={attribute.label}
                          className={fieldClass}
                        />
                      )}
                      {invalid ? (
                        <p className="text-xs text-destructive">{attribute.label} is required</p>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )

      case "need":
        return (
          <>
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What do you need? *</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={guidedOn ? 4 : 5}
                      className={guided === "phones" ? "md:text-base lg:text-sm" : undefined}
                      placeholder="Describe what you need: name, type, size, quantity and any other details. Our team follows up to confirm specifics."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {enableAttachments && (
              <div className="grid gap-1.5">
                <label className="text-sm font-medium text-ink-800">
                  Photo <span className="font-normal text-ink-500">(optional)</span>
                </label>
                <AttachmentUploader value={attachments} onChange={setAttachments} />
              </div>
            )}
          </>
        )

      case "qty":
        return (
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="any"
                      placeholder="500"
                      className={fieldClass}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit</FormLabel>
                  <FormControl>
                    <Input placeholder="bag / ton / CFT / sft" className={fieldClass} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )

      case "where":
        return (
          <FormField
            control={form.control}
            name="deliveryLocation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Delivery address *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Road, area, city"
                    autoComplete="street-address"
                    className={fieldClass}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )

      case "when":
        return (
          <FormField
            control={form.control}
            name="deliveryDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Desired delivery / start date</FormLabel>
                <FormControl>
                  <Input type="date" className={fieldClass} {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )

      case "who":
        return (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Rahim Uddin"
                        autoComplete="name"
                        className={fieldClass}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone *</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        inputMode="tel"
                        placeholder="+8801712345678"
                        autoComplete="tel"
                        className={fieldClass}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      className={fieldClass}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="company"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="ABC Construction Ltd."
                      autoComplete="organization"
                      className={fieldClass}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )

      case "note":
        return (
          <>
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note for sellers (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Brand or size preferences, site access, best time to call"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {enableAttachments && (
              <div className="grid gap-1.5">
                <label className="text-sm font-medium text-ink-800">
                  Photo <span className="font-normal text-ink-500">(optional)</span>
                </label>
                <AttachmentUploader value={attachments} onChange={setAttachments} />
              </div>
            )}
          </>
        )
    }
  }

  const formElement = (
    <div className={guidedOn ? undefined : className}>
      {showHeader && !guidedOn && (
        <div className="mb-4 border-b border-border/60 pb-4">
          <h2 className="font-heading text-xl font-semibold text-ink-900">
            {context?.productName
              ? `Get a quote for ${context.productName}`
              : context?.supplierName
                ? `Get a quote from ${context.supplierName}`
                : context?.categoryName
                  ? `Get a quote for ${context.categoryName}`
                  : "Get a Quote"}
          </h2>
          <p className="mt-1 text-sm text-ink-600">
            Share your requirement. Verified suppliers usually reply within 24 hours.
          </p>
        </div>
      )}

      <Form {...form}>
        <form id={formId} onSubmit={onFormSubmit} noValidate className="grid gap-4">
          {requestingFrom && (
            <div className="line-clamp-1 rounded-lg border border-brand-100 bg-brand-50/60 px-3 py-2 text-xs text-brand-800 md:line-clamp-none">
              <span className="font-medium">Requesting from: </span>
              {requestingFrom}
            </div>
          )}

          {screens.map((meta, index) => (
            <motion.div
              key={meta.id}
              role="group"
              aria-labelledby={`${uid}-${meta.id}-title`}
              className={cn("grid min-w-0 gap-4", screenClass(index))}
              // Guided screens slide: the one shown rests at 0, others wait on the
              // side they came from, so next enters from the right, back from the left.
              initial={false}
              animate={
                slideScreens && index !== screenIndex
                  ? { x: index < screenIndex ? -28 : 28, opacity: 0 }
                  : { x: 0, opacity: 1 }
              }
              transition={springs.move}
            >
              <TitleTag id={`${uid}-${meta.id}-title`} className={legendClass}>
                {meta.title}
              </TitleTag>
              {renderScreen(meta)}
            </motion.div>
          ))}

          {/* Items mode: one line per product so the buyer sees each request land,
              with the run's message right under it (one block to scroll to). */}
          {itemsMode ? (
            <div ref={runRef} className="grid scroll-mb-28 gap-4 empty:hidden md:scroll-mb-6">
              {itemRun ? (
                <div className="grid gap-2 border-t border-border/60 pt-4">
                  <p role="status" className="text-sm font-bold text-ink-900">
                    {runHeadline(itemRun)}
                  </p>
                  <ol className="grid gap-1">
                    {itemRun.map((entry) => (
                      <li key={entry.productId} className="flex items-start gap-2.5 py-1">
                        {/* Keyed by status: each change swaps the icon with a short fade + settle. */}
                        <motion.span
                          key={entry.status}
                          className="mt-0.5 flex size-5 shrink-0 items-center justify-center"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.18, ease: EASE_OUT }}
                        >
                          <RunIcon status={entry.status} />
                        </motion.span>
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-1 text-sm font-semibold text-ink-800">
                            {entry.name}
                          </span>
                          <span
                            className={cn(
                              "line-clamp-2 text-xs",
                              entry.status === "failed"
                                ? "text-destructive"
                                : entry.status === "unconfirmed"
                                  ? "text-amber-800"
                                  : "text-ink-500",
                            )}
                          >
                            {entry.quantity}
                            {entry.unit ? ` ${entry.unit}` : ""} · {RUN_LABEL[entry.status]}
                            {entry.status === "failed" && entry.error ? `: ${entry.error}` : ""}
                          </span>
                        </span>
                        {/* Never resent on its own: it may already be with the seller. */}
                        {entry.status === "unconfirmed" ? (
                          <button
                            type="button"
                            aria-pressed={Boolean(entry.resend)}
                            disabled={submitting}
                            onClick={() => toggleResend(entry.productId)}
                            className={cn(
                              "-my-1.5 inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-bold transition-[background-color,color,scale] duration-140 ease-(--ease-out) active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:pointer-events-none disabled:opacity-50 motion-reduce:active:scale-100",
                              entry.resend
                                ? "bg-brand-50 text-brand-800"
                                : "text-brand-700 hover:bg-brand-50",
                            )}
                          >
                            {entry.resend ? (
                              <CheckCircle2 aria-hidden="true" className="size-3.5" />
                            ) : null}
                            Send again
                            <span className="sr-only">: {entry.name}</span>
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
              {submitState.status === "error" ? (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                >
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{submitState.message}</span>
                </div>
              ) : null}
            </div>
          ) : (
            submitState.status === "error" && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{submitState.message}</span>
              </div>
            )
          )}

          {hideSubmit !== true && (
            <div
              className={cn(
                "items-center justify-end gap-2 border-t border-border/60 pt-4",
                guided === "always"
                  ? "hidden"
                  : guided === "phones" || hideSubmit === "phones"
                    ? "hidden md:flex"
                    : "flex",
              )}
            >
              <button
                type="submit"
                disabled={submitting}
                className={cn("btn-tactile", itemsMode && "btn-tactile--block")}
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <SendHorizontal className="size-4" />
                    {itemsMode
                      ? sendable <= 1
                        ? "Send request"
                        : `Send ${sendable} requests`
                      : "Submit Quote Request"}
                  </>
                )}
              </button>
            </div>
          )}
        </form>
      </Form>
    </div>
  )

  if (!guided) return formElement

  const offset = progress?.offset ?? 0
  const total = progress?.total ?? screens.length
  const optional = !currentRequired
  const disabled = submitting || (currentRequired && !screenIsFilled(current.id))
  const label = isLast
    ? "Send my request"
    : optional && !screenIsFilled(current.id)
      ? "Skip"
      : "Continue"

  return (
    <GuidedShell
      step={offset + screenIndex}
      total={total}
      bubble={current.bubble}
      mood={submitting ? "think" : "idle"}
      onBack={screenIndex > 0 || onExit ? goBack : undefined}
      backHref={screenIndex === 0 && !onExit ? (exitHref ?? "/marketplace") : undefined}
      phonesOnly={guided === "phones"}
      animateContent={false}
      className={className}
      action={(placement, { guard }) => (
        <button
          // Distinct keys: Continue and the final Send are different buttons, so
          // React never carries one's click over to the other.
          key={isLast ? "submit" : "continue"}
          type="button"
          disabled={disabled}
          // Taps right after a screen appears are ignored (a double tap), and a
          // little longer before the final send so it cannot fire by accident.
          onClick={guard(() => void advance(), isLast ? 700 : 300)}
          className={cn(
            "btn-tactile",
            placement === "bar" ? "flex-1" : "min-w-56",
            !disabled &&
              "animate-[choice-pop_280ms_cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:animate-none",
          )}
        >
          {submitting ? (
            <>
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              {label}
              {isLast ? (
                <SendHorizontal aria-hidden="true" className="size-4" />
              ) : (
                <ArrowRight aria-hidden="true" className="size-4" />
              )}
            </>
          )}
        </button>
      )}
    >
      {formElement}
    </GuidedShell>
  )
}

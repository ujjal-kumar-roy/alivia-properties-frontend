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

type ItemRunStatus = "waiting" | "sending" | "sent" | "failed"
type ItemRun = QuoteItemRequest & { status: ItemRunStatus; error?: string }

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
   * Items mode: called after a run with the products whose request went
   * through, so the host can drop them from its list. `complete` = all sent
   * (with redirectOnSuccess the page is already navigating away).
   */
  onItemsSent?: (productIds: string[], outcome: { complete: boolean }) => void
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
      return <Circle aria-hidden="true" className="size-4 text-ink-300" />
    case "sending":
      return <Loader2 aria-hidden="true" className="size-4 text-brand-600 motion-safe:animate-spin" />
    case "sent":
      return <CheckCircle2 aria-hidden="true" className="size-4 text-green-600" />
    case "failed":
      return <AlertCircle aria-hidden="true" className="size-4 text-destructive" />
  }
}

const RUN_LABEL: Record<ItemRunStatus, string> = {
  waiting: "Waiting",
  sending: "Sending...",
  sent: "Sent to the seller",
  failed: "Not sent",
}

function runHeadline(run: ItemRun[]) {
  const sent = run.filter((entry) => entry.status === "sent").length
  const settled = run.filter((entry) => entry.status === "sent" || entry.status === "failed").length
  if (settled < run.length) return `Sending ${settled + 1} of ${run.length}...`
  return sent === run.length ? "All requests sent" : `${sent} of ${run.length} sent`
}

export function GetQuoteForm({
  context,
  onSuccess,
  showHeader = false,
  redirectOnSuccess = false,
  supplierIds,
  mode = "single",
  items,
  onItemsSent,
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

  // Items mode: bring the progress list into view when a run starts (the send
  // button may be the phone's bottom bar, far from the list).
  const runShown = itemRun !== null
  React.useEffect(() => {
    if (!runShown) return
    runRef.current?.scrollIntoView({
      block: "nearest",
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    })
  }, [runShown])

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

  /**
   * Items mode: one POST /marketplace/quotes per product (the API has no
   * multi-product quote), sent one after another so progress reads in order.
   * Sent products are reported to the host; failed ones stay for a retry.
   */
  async function sendItems(values: QuoteFormValues, specs: QuoteSpec[]) {
    const queue = items ?? []
    if (itemsInFlight.current) return
    if (!queue.length) {
      setSubmitState({ status: "error", message: "Your quote list is empty. Add a product first." })
      return
    }
    itemsInFlight.current = true
    setSubmitState({ status: "submitting" })

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

    let run: ItemRun[] = queue.map((item) => ({ ...item, status: "waiting" }))
    const mark = (index: number, patch: Partial<ItemRun>) => {
      run = run.map((entry, i) => (i === index ? { ...entry, ...patch } : entry))
      setItemRun(run)
    }
    setItemRun(run)

    const sent: { productId: string; quoteId: string; seller: string }[] = []
    for (const [index, item] of queue.entries()) {
      mark(index, { status: "sending" })
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
        )
        sent.push({
          productId: item.productId,
          quoteId: quote.id,
          seller: item.supplierId ?? item.productId,
        })
        mark(index, { status: "sent" })
      } catch (err) {
        mark(index, { status: "failed", error: errorText(err) })
      }
    }

    const sentIds = sent.map((entry) => entry.productId)
    const complete = sent.length === queue.length
    if (complete && redirectOnSuccess) {
      // `count` = sellers reached (the thank-you copy reads it as suppliers),
      // `items` = requests sent. Like batch, stay in "Sending..." until the
      // thank-you page replaces this one.
      const sellers = new Set(sent.map((entry) => entry.seller)).size
      window.location.assign(
        `${ROUTES.MARKETPLACE_QUOTE_THANK_YOU}?count=${sellers}&items=${sent.length}`,
      )
      onItemsSent?.(sentIds, { complete: true })
      return
    }

    itemsInFlight.current = false
    onItemsSent?.(sentIds, { complete })
    if (complete) {
      setItemRun(null)
      setSubmitState({ status: "success", quoteId: sent[0].quoteId, email: values.email })
      resetForm()
      celebrate()
      onSuccess?.(sent[0].quoteId)
      return
    }
    const failed = queue.length - sent.length
    setSubmitState({
      status: "error",
      message: sent.length
        ? `${failed} of ${queue.length} requests could not be sent. They are still in your list, so you can send them again.`
        : "Your requests could not be sent. Check your connection and try again.",
    })
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

          {/* Items mode: one line per product so the buyer sees each request land. */}
          {itemsMode && itemRun ? (
            <div
              ref={runRef}
              className="grid scroll-mb-28 gap-2 border-t border-border/60 pt-4 md:scroll-mb-6"
            >
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
                          entry.status === "failed" ? "text-destructive" : "text-ink-500",
                        )}
                      >
                        {entry.quantity}
                        {entry.unit ? ` ${entry.unit}` : ""} · {RUN_LABEL[entry.status]}
                        {entry.status === "failed" && entry.error ? `: ${entry.error}` : ""}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          {submitState.status === "error" && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{submitState.message}</span>
            </div>
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
                      ? `Send request for ${items?.length ?? 0} item${items?.length === 1 ? "" : "s"}`
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

"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import {
  type Control,
  type FieldErrors,
  type FieldPath,
  type Resolver,
  useForm,
  useWatch,
} from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Landmark,
  Laptop,
  MoreHorizontal,
  Plane,
  Store,
  type LucideIcon,
} from "lucide-react"
import { motion } from "motion/react"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { CountUp } from "@/components/common/count-up"
import { GuideAvatar } from "@/components/common/guide-avatar"
import { MobileActionBar } from "@/components/common/mobile-action-bar"
import { ProgressBar } from "@/components/common/progress-bar"
import { ROUTES } from "@/config/routes.config"
import { celebrate, haptic, prefersReducedMotion } from "@/lib/celebrate"
import { springs } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { formatPrice } from "@/utils/format-price"
import { banksService } from "@/services/banks.service"
import { preApprovalService } from "@/services/pre-approval.service"
import { ApiError } from "@/services/http-client"
import type { Bank } from "@/types/bank.types"

const EMPLOYMENT_TYPES: { value: string; label: string; icon: LucideIcon }[] = [
  { value: "salaried", label: "Salaried", icon: Briefcase },
  { value: "business-owner", label: "Business owner", icon: Store },
  { value: "freelancer", label: "Freelancer", icon: Laptop },
  { value: "government-service", label: "Government service", icon: Landmark },
  { value: "expat", label: "Expat", icon: Plane },
  { value: "other", label: "Other", icon: MoreHorizontal },
]

const TENURES = [10, 15, 20, 25, 30]

const schema = z.object({
  fullName: z.string().min(2, "Enter your full name"),
  email: z.string().email("Enter a valid email address"),
  phone: z.string().min(7, "Enter a valid phone number"),
  monthlyIncome: z.coerce.number().min(1, "Monthly income is required"),
  monthlyExpenses: z.coerce.number().min(0, "Expenses cannot be negative"),
  employmentType: z.enum(
    ["salaried", "business-owner", "freelancer", "government-service", "expat", "other"],
    "Select employment type",
  ),
  employerName: z.string().optional().default(""),
  yearsEmployed: z.coerce.number().min(0, "Years employed cannot be negative"),
  downPayment: z.coerce.number().min(0, "Down payment cannot be negative"),
  loanAmount: z.coerce.number().min(1, "Loan amount is required"),
  tenureYears: z.coerce.number().min(1).max(30),
  creditScore: z.coerce.number().min(300).max(900),
})

type FormValues = z.output<typeof schema>
type FormInput = {
  fullName: string
  email: string
  phone: string
  monthlyIncome: unknown
  monthlyExpenses: unknown
  employmentType: FormValues["employmentType"]
  employerName?: string
  yearsEmployed: unknown
  downPayment: unknown
  loanAmount: unknown
  tenureYears: unknown
  creditScore: unknown
}
type SubmissionResult = {
  approved: boolean
  approvedAmount?: number | null
  emi?: number | null
  dti?: number | null
}

type FieldName = FieldPath<FormInput>
type MoneyField = "monthlyIncome" | "monthlyExpenses" | "loanAmount" | "downPayment"

/**
 * Phones answer one short group at a time (see `StepGroup`); from md every group
 * is on screen at once, exactly like the original single form. The fields,
 * schema and submit are the same either way.
 */
const STEPS: { title: string; hint: string; fields: FieldName[] }[] = [
  { title: "About you", hint: "So we can save your request.", fields: ["fullName", "phone", "email"] },
  { title: "Your work", hint: "How you earn today.", fields: ["employmentType", "employerName", "yearsEmployed"] },
  { title: "Your income", hint: "Monthly figures in BDT.", fields: ["monthlyIncome", "monthlyExpenses"] },
  { title: "Your loan", hint: "What you would like to borrow.", fields: ["loanAmount", "downPayment", "tenureYears", "creditScore"] },
]
const LAST_STEP = STEPS.length - 1

// CountUp feeds fractional values while it runs; whole taka only.
const fmtShort = (n: number) => formatPrice(Math.round(n), true)
const fmtPercent = (n: number) => n.toFixed(1)

const LABEL = "text-[0.8125rem] font-semibold text-ink-800"
const ITEM = "gap-1.5"

/** Same breakpoint as the stepper (below md the groups are shown one at a time). */
function isStepped() {
  return window.matchMedia("(max-width: 767px)").matches
}

function StepGroup({
  index,
  active,
  moved,
  children,
}: {
  index: number
  active: boolean
  /** True once the visitor has used Back or Continue: the group then slides in. */
  moved: boolean
  children: ReactNode
}) {
  const step = STEPS[index]
  return (
    <div
      role="group"
      aria-labelledby={`pre-approval-step-${index}`}
      className={cn(
        "space-y-3.5",
        index > 0 && "md:border-t md:border-border/60 md:pt-4",
        !active && "max-md:hidden",
        active && moved && "anim-slide-up",
      )}
    >
      <div>
        <h2 id={`pre-approval-step-${index}`} className="text-base font-bold text-ink-900">
          {step.title}
        </h2>
        <p className="text-[0.8125rem] text-ink-600">{step.hint}</p>
      </div>
      {children}
    </div>
  )
}

/** Live "৳90 L" under an amount, so a missed zero is obvious before submitting. */
function MoneyHint({
  control,
  name,
}: {
  control: Control<FormInput, undefined, FormValues>
  name: MoneyField
}) {
  const raw = useWatch({ control, name })
  const n = typeof raw === "number" ? raw : typeof raw === "string" && raw !== "" ? Number(raw) : NaN
  if (!Number.isFinite(n) || n <= 0) return null
  return <p className="text-xs font-medium tabular-nums text-ink-600">{formatPrice(n, true)}</p>
}

export function PreApprovalForm() {
  const { data: session } = useSession()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [result, setResult] = useState<SubmissionResult | null>(null)
  const [banks, setBanks] = useState<Bank[]>([])
  const [step, setStep] = useState(0)
  const [moved, setMoved] = useState(false)
  const resultRef = useRef<HTMLDivElement>(null)
  // When the visitor reached the last group, to ignore a double tap on Continue.
  const reachedLastAt = useRef(0)

  const form = useForm<FormInput, undefined, FormValues>({
    resolver: zodResolver(schema) as Resolver<FormInput, undefined, FormValues>,
    // Validate a field once it was touched, then keep it fresh while typing:
    // a fixed field loses its error without waiting for the next Continue.
    mode: "onTouched",
    defaultValues: {
      fullName: session?.user?.name ?? "",
      email: session?.user?.email ?? "",
      phone: "",
      monthlyIncome: 150000,
      monthlyExpenses: 60000,
      employmentType: "salaried",
      employerName: "",
      yearsEmployed: 3,
      downPayment: 2500000,
      loanAmount: 9000000,
      tenureYears: 20,
      creditScore: 720,
    },
  })

  useEffect(() => {
    if (session?.user?.name) form.setValue("fullName", session.user.name)
    if (session?.user?.email) form.setValue("email", session.user.email)
  }, [form, session?.user?.email, session?.user?.name])

  useEffect(() => {
    void banksService.list().then(setBanks).catch(() => setBanks([]))
  }, [])

  // A fresh result scrolls into view (the form above it is taller than a phone screen).
  useEffect(() => {
    if (!result) return
    resultRef.current?.scrollIntoView({
      block: "start",
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    })
  }, [result])

  const bestBank = useMemo(() => {
    if (banks.length === 0) return null
    return [...banks].sort((left, right) => left.interestRate - right.interestRate)[0]
  }, [banks])

  async function goNext() {
    const ok = await form.trigger(STEPS[step].fields, { shouldFocus: true })
    if (!ok) return
    haptic("tap")
    const next = Math.min(step + 1, LAST_STEP)
    if (next === LAST_STEP) reachedLastAt.current = Date.now()
    setMoved(true)
    setStep(next)
  }

  function goBack() {
    setMoved(true)
    setStep((s) => Math.max(s - 1, 0))
  }

  // Safety net: if a hidden earlier group is somehow invalid, take the visitor to it.
  function onInvalid(errors: FieldErrors<FormInput>) {
    if (!isStepped()) return
    const bad = STEPS.findIndex((s) => s.fields.some((f) => errors[f as keyof FormInput]))
    if (bad >= 0) setStep(bad)
  }

  async function onSubmit(values: FormValues) {
    if (!session?.accessToken) {
      setSubmitError("Please sign in first so we can save your pre-approval request.")
      return
    }

    setSubmitError(null)

    try {
      const response = await preApprovalService.submit(
        {
          ...values,
          employerName: values.employerName || undefined,
          monthlyExpenses: values.monthlyExpenses || undefined,
          yearsEmployed: values.yearsEmployed || undefined,
          creditScore: values.creditScore || undefined,
        },
        session.accessToken,
      )

      setResult({
        approved: response.approved,
        approvedAmount: response.approvedAmount,
        emi: response.emi,
        dti: response.dti,
      })
      // Confetti only for a positive outcome.
      if (response.approved) celebrate()
    } catch (error) {
      setSubmitError(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Could not submit your pre-approval request right now.",
      )
    }
  }

  const submitting = form.formState.isSubmitting
  const progress = result ? 100 : (step / STEPS.length) * 100

  return (
    <div className="space-y-3.5 sm:space-y-5">
      {!session?.accessToken && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-3 py-2 text-[0.8125rem] leading-snug text-brand-900 sm:px-4 sm:py-3 sm:text-sm">
          <p>Sign in to submit and save your pre-approval request.</p>
          <Link href={ROUTES.LOGIN} className="glass-chip shrink-0">
            Sign in
          </Link>
        </div>
      )}

      <Form {...form}>
        <form
          noValidate
          onSubmit={(e) => {
            if (isStepped()) {
              // Enter on a phone moves to the next group instead of submitting half the answers.
              if (step < LAST_STEP) {
                e.preventDefault()
                void goNext()
                return
              }
              // A double tap on Continue would land on the final button: let the visitor see it first.
              if (Date.now() - reachedLastAt.current < 700) {
                e.preventDefault()
                return
              }
            }
            void form.handleSubmit(onSubmit, onInvalid)(e)
          }}
          className={cn("md:[&_input:not([type=checkbox])]:h-10", result && "max-md:hidden")}
        >
          <div className="space-y-3.5 rounded-2xl border border-black/5 bg-white p-3.5 shadow-(--shadow-card) sm:p-5">
            {/* Phones: where you are in the flow. */}
            <div className="md:hidden">
              <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-ink-600">
                <span aria-live="polite">
                  Step {step + 1} of {STEPS.length}
                </span>
                <span className="tabular-nums">{Math.round(progress)}%</span>
              </div>
              <ProgressBar value={progress} label="Pre-approval progress" className="h-2.5" />
            </div>

            {submitError && (
              <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {submitError}
              </div>
            )}

            <StepGroup index={0} active={step === 0} moved={moved}>
              <div className={cn("grid grid-cols-1 gap-3.5 md:grid-cols-2", !moved && "enter-cascade")}>
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem className={ITEM}>
                      <FormLabel className={LABEL}>Full name *</FormLabel>
                      <FormControl>
                        <Input autoComplete="name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem className={ITEM}>
                      <FormLabel className={LABEL}>Phone *</FormLabel>
                      <FormControl>
                        <Input type="tel" autoComplete="tel" {...field} placeholder="+8801712345678" />
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
                  <FormItem className={ITEM}>
                    <FormLabel className={LABEL}>Email *</FormLabel>
                    <FormControl>
                      <Input type="email" autoComplete="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </StepGroup>

            <StepGroup index={1} active={step === 1} moved={moved}>
              <FormField
                control={form.control}
                name="employmentType"
                render={({ field }) => (
                  <FormItem className={ITEM}>
                    <FormLabel id="pre-approval-employment" className={LABEL}>
                      Employment type *
                    </FormLabel>
                    <FormControl>
                      <div
                        role="radiogroup"
                        aria-labelledby="pre-approval-employment"
                        className="grid grid-cols-2 gap-2 md:grid-cols-3"
                      >
                        {EMPLOYMENT_TYPES.map(({ value, label, icon: Icon }) => {
                          const selected = field.value === value
                          return (
                            <button
                              key={value}
                              type="button"
                              role="radio"
                              aria-checked={selected}
                              onClick={() => {
                                if (!selected) haptic("tap")
                                field.onChange(value)
                              }}
                              className="choice-card min-h-12 gap-2 px-2.5 py-2 text-[0.8125rem] leading-tight md:text-sm"
                            >
                              <Icon aria-hidden="true" className="size-4 shrink-0" />
                              <span>{label}</span>
                            </button>
                          )
                        })}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="employerName"
                  render={({ field }) => (
                    <FormItem className={ITEM}>
                      <FormLabel className={LABEL}>Employer / business name</FormLabel>
                      <FormControl>
                        <Input autoComplete="organization" {...field} value={field.value ?? ""} placeholder="Optional" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="yearsEmployed"
                  render={({ field }) => (
                    <FormItem className={ITEM}>
                      <FormLabel className={LABEL}>Years employed</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          {...field}
                          value={typeof field.value === "number" || typeof field.value === "string" ? field.value : ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </StepGroup>

            <StepGroup index={2} active={step === 2} moved={moved}>
              <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="monthlyIncome"
                  render={({ field }) => (
                    <FormItem className={ITEM}>
                      <FormLabel className={LABEL}>Monthly income (BDT) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          {...field}
                          value={typeof field.value === "number" || typeof field.value === "string" ? field.value : ""}
                        />
                      </FormControl>
                      <MoneyHint control={form.control} name="monthlyIncome" />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="monthlyExpenses"
                  render={({ field }) => (
                    <FormItem className={ITEM}>
                      <FormLabel className={LABEL}>Monthly expenses (BDT) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          {...field}
                          value={typeof field.value === "number" || typeof field.value === "string" ? field.value : ""}
                        />
                      </FormControl>
                      <MoneyHint control={form.control} name="monthlyExpenses" />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </StepGroup>

            <StepGroup index={3} active={step === 3} moved={moved}>
              <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="loanAmount"
                  render={({ field }) => (
                    <FormItem className={ITEM}>
                      <FormLabel className={LABEL}>Loan amount (BDT) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          {...field}
                          value={typeof field.value === "number" || typeof field.value === "string" ? field.value : ""}
                        />
                      </FormControl>
                      <MoneyHint control={form.control} name="loanAmount" />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="downPayment"
                  render={({ field }) => (
                    <FormItem className={ITEM}>
                      <FormLabel className={LABEL}>Down payment (BDT) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          {...field}
                          value={typeof field.value === "number" || typeof field.value === "string" ? field.value : ""}
                        />
                      </FormControl>
                      <MoneyHint control={form.control} name="downPayment" />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="tenureYears"
                  render={({ field }) => (
                    <FormItem className={ITEM}>
                      <FormLabel id="pre-approval-tenure" className={LABEL}>
                        Loan tenure (years) *
                      </FormLabel>
                      <FormControl>
                        <div
                          role="radiogroup"
                          aria-labelledby="pre-approval-tenure"
                          className="grid grid-cols-5 gap-1.5"
                        >
                          {TENURES.map((year) => {
                            const selected = Number(field.value) === year
                            return (
                              <button
                                key={year}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                aria-label={`${year} years`}
                                data-selected={selected}
                                onClick={() => {
                                  if (!selected) haptic("tap")
                                  field.onChange(year)
                                }}
                                className="glass-chip px-0 tabular-nums"
                              >
                                {year}
                              </button>
                            )
                          })}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="creditScore"
                  render={({ field }) => (
                    <FormItem className={ITEM}>
                      <FormLabel className={LABEL}>Credit score</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={300}
                          max={900}
                          {...field}
                          value={typeof field.value === "number" || typeof field.value === "string" ? field.value : ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </StepGroup>

            {/* md and up: one submit under the whole form. */}
            <div className="hidden pt-1 md:block">
              <button type="submit" disabled={submitting} className="btn-tactile btn-tactile--block">
                {submitting ? "Checking eligibility…" : "Check Eligibility"}
              </button>
            </div>
          </div>

          {/* Phones: Back and Continue (or the final check) stay at thumb reach. */}
          {!result && (
            <MobileActionBar label="Pre-approval steps">
              {step > 0 && (
                <button
                  type="button"
                  onClick={goBack}
                  aria-label="Back"
                  className="btn-glass size-11 shrink-0 p-0"
                >
                  <ArrowLeft aria-hidden="true" className="size-5" />
                </button>
              )}
              {/* Distinct keys: React must not morph Continue into the submit button
                  mid click (the click would then submit the form). */}
              {step < LAST_STEP ? (
                <button
                  key="continue"
                  type="button"
                  onClick={() => void goNext()}
                  className="btn-tactile btn-tactile--block flex-1"
                >
                  Continue
                  <ArrowRight aria-hidden="true" className="size-4" />
                </button>
              ) : (
                <button
                  key="submit"
                  type="submit"
                  disabled={submitting}
                  className="btn-tactile btn-tactile--block flex-1"
                >
                  {submitting ? "Checking eligibility…" : "Check Eligibility"}
                </button>
              )}
            </MobileActionBar>
          )}
        </form>
      </Form>

      {result && (
        <motion.div
          ref={resultRef}
          role="status"
          initial={{ opacity: 0, y: 18, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={springs.sheet}
          className={cn(
            "scroll-mt-20 rounded-2xl border p-3.5 sm:p-5",
            result.approved ? "border-brand-200 bg-brand-50" : "border-red-200 bg-red-50",
          )}
        >
          <div className="flex items-start gap-3">
            <GuideAvatar mood={result.approved ? "cheer" : "think"} size={44} className="mt-0.5" />
            <div className="speech-bubble min-w-0 flex-1">
              <p className={cn("text-base font-extrabold", result.approved ? "text-brand-800" : "text-red-700")}>
                {result.approved ? "Pre-approved" : "Not eligible yet"}
              </p>
              <p className="mt-0.5 text-sm font-medium text-ink-600">
                {result.approved
                  ? "Here is your indicative offer."
                  : "Adjusting the loan amount or down payment may help."}
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springs.move, delay: 0.12 }}
              className="rounded-xl bg-white p-3 shadow-sm"
            >
              <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-ink-500">Approved amount</p>
              <p className="mt-1 text-lg font-extrabold tabular-nums text-brand-700">
                <CountUp value={result.approvedAmount ?? 0} format={fmtShort} />
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springs.move, delay: 0.2 }}
              className="rounded-xl bg-white p-3 shadow-sm"
            >
              <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-ink-500">Estimated EMI</p>
              <p className="mt-1 text-lg font-extrabold tabular-nums text-ink-900">
                <CountUp value={result.emi ?? 0} format={fmtShort} />
              </p>
            </motion.div>
          </div>

          <div className="mt-2.5 rounded-xl bg-white/80 px-3 py-2.5 text-sm text-ink-700">
            <p>
              DTI ratio:{" "}
              <span className="font-semibold tabular-nums">
                <CountUp value={(result.dti ?? 0) * 100} format={fmtPercent} />%
              </span>
            </p>
            {bestBank && (
              <p className="mt-1">
                Best published rate right now: <span className="font-semibold">{bestBank.name}</span> at{" "}
                <span className="font-semibold">{bestBank.interestRate}%</span>.
              </p>
            )}
          </div>

          {/* Phones swap the form for this card: a way back to the loan step. */}
          <button
            type="button"
            onClick={() => {
              setResult(null)
              setStep(LAST_STEP)
            }}
            className="btn-glass mt-3 w-full md:hidden"
          >
            Adjust my details
          </button>
        </motion.div>
      )}
    </div>
  )
}

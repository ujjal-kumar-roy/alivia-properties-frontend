"use client"

import { useState } from "react"
import { AnimatePresence } from "motion/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { FormSuccess } from "@/components/booking/form-success"
import { ROUTES } from "@/config/routes.config"
import { haptic } from "@/lib/celebrate"
import { authService } from "@/services/auth.service"
import { ApiError } from "@/services/http-client"
import { FieldMessage, Reveal, SubmitLabel } from "../_components/auth-motion"

const ROLES = ["seller", "buyer"] as const

const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(11, "Enter a valid phone number"),
    role: z.enum(ROLES, "Select account type"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/(?=.*[A-Z])(?=.*[a-z])(?=.*\d)/, "Use uppercase, lowercase, and a number"),
    confirmPassword: z.string().min(1, "Confirm your password"),
    agreeToTerms: z.boolean(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.agreeToTerms === true, {
    message: "You must agree to the Terms of Service and Privacy Policy",
    path: ["agreeToTerms"],
  })

type RegisterInput = z.infer<typeof registerSchema>

const LABEL = "text-[0.8125rem] font-semibold text-ink-800"
const ITEM = "gap-1.5"
/** Inline link with a taller hit area; the padding is cancelled so lines do not move. */
const INLINE_LINK =
  "-my-1.5 inline-block py-1.5 font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800"

export function RegisterForm() {
  const router = useRouter()
  const [success, setSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: "buyer", agreeToTerms: false },
  })

  async function onSubmit(values: RegisterInput) {
    setSubmitError(null)

    try {
      await authService.register({
        name: values.name,
        email: values.email,
        phone: values.phone,
        role: values.role,
        password: values.password,
      })
      setSuccess(true)
      setTimeout(() => router.push(ROUTES.LOGIN), 2200)
    } catch (error) {
      setSubmitError(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Could not create your account right now.",
      )
    }
  }

  if (success) {
    return (
      <FormSuccess title="Account created" confetti={false} className="border-0 bg-transparent p-0 sm:p-0">
        Check your email to verify the account, then sign in.
      </FormSuccess>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3.5 md:[&_input:not([type=checkbox])]:h-10">
        <AnimatePresence initial={false}>
          {submitError && (
            <Reveal key="submit-error" className="pb-3.5">
              <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {submitError}
              </div>
            </Reveal>
          )}
        </AnimatePresence>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className={ITEM}>
              <FormLabel className={LABEL}>Full Name</FormLabel>
              <FormControl>
                <Input autoComplete="name" placeholder="Md. Rafiqul Islam" {...field} value={field.value ?? ""} />
              </FormControl>
              <FieldMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className={ITEM}>
              <FormLabel className={LABEL}>Email Address</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" placeholder="you@example.com" {...field} value={field.value ?? ""} />
              </FormControl>
              <FieldMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem className={ITEM}>
              <FormLabel className={LABEL}>Phone Number</FormLabel>
              <FormControl>
                <Input type="tel" autoComplete="tel" placeholder="01700-000000" {...field} value={field.value ?? ""} />
              </FormControl>
              <FieldMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem className={ITEM}>
              <FormLabel id="register-role-label" className={LABEL}>
                Account Type
              </FormLabel>
              <FormControl>
                <div role="radiogroup" aria-labelledby="register-role-label" className="grid grid-cols-2 gap-2">
                  {ROLES.map((role) => (
                    <button
                      key={role}
                      type="button"
                      role="radio"
                      aria-checked={field.value === role}
                      onClick={() => {
                        if (field.value !== role) haptic("tap")
                        field.onChange(role)
                      }}
                      className="choice-card min-h-12 flex-col items-start gap-0 px-3 py-2"
                    >
                      <span className="text-sm font-bold capitalize">{role}</span>
                      <span className="text-xs font-medium text-ink-600">
                        {role === "seller" ? "List properties" : "Find properties"}
                      </span>
                    </button>
                  ))}
                </div>
              </FormControl>
              <FieldMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-3.5 sm:grid-cols-2 sm:gap-3">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className={ITEM}>
                <FormLabel className={LABEL}>Password</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" placeholder="Min 8 chars" {...field} value={field.value ?? ""} />
                </FormControl>
                <FieldMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem className={ITEM}>
                <FormLabel className={LABEL}>Confirm Password</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" placeholder="Repeat password" {...field} value={field.value ?? ""} />
                </FormControl>
                <FieldMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="agreeToTerms"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start gap-2.5 space-y-0">
              <FormControl>
                <input
                  type="checkbox"
                  name={field.name}
                  ref={field.ref}
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  onBlur={field.onBlur}
                  className="size-6 shrink-0 cursor-pointer rounded-md accent-brand-600"
                />
              </FormControl>
              <div className="min-w-0">
                <FormLabel className="block cursor-pointer text-[0.8125rem] font-normal leading-snug text-ink-700">
                  I agree to the{" "}
                  <Link href={ROUTES.TERMS} target="_blank" rel="noopener noreferrer" className={INLINE_LINK}>
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href={ROUTES.PRIVACY} target="_blank" rel="noopener noreferrer" className={INLINE_LINK}>
                    Privacy Policy
                  </Link>
                </FormLabel>
                <FieldMessage inGrid={false} />
              </div>
            </FormItem>
          )}
        />

        <button
          type="submit"
          className="btn-tactile btn-tactile--block"
          disabled={form.formState.isSubmitting}
        >
          <SubmitLabel busy={form.formState.isSubmitting} idle="Create Account" busyLabel="Creating account…" />
        </button>
      </form>
    </Form>
  )
}

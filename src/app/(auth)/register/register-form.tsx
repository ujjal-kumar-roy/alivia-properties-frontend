"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { CheckCircle } from "lucide-react"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { ROUTES } from "@/config/routes.config"
import { authService } from "@/services/auth.service"
import { ApiError } from "@/services/http-client"

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
      <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
        <CheckCircle className="h-10 w-10 text-green-500" />
        <h3 className="font-bold">Account created</h3>
        <p className="text-sm text-muted-foreground">
          Check your email to verify the account, then sign in.
        </p>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {submitError && (
        <div aria-live="polite" className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {submitError}
        </div>
        )}

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="Md. Rafiqul Islam" {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <Input type="email" placeholder="you@example.com" {...field} value={field.value ?? ""} />
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
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input placeholder="01700-000000" {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account Type</FormLabel>
              <div className="grid gap-3 sm:grid-cols-2">
                {ROLES.map((role) => (
                  <label
                    key={role}
                    className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${
                      field.value === role
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-border hover:border-brand-300"
                    }`}
                  >
                    <input
                      type="radio"
                      value={role}
                      checked={field.value === role}
                      onChange={() => field.onChange(role)}
                      className="peer sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className="flex size-5 shrink-0 items-center justify-center rounded-full border border-ink-300 bg-white transition-colors peer-checked:border-brand-700 peer-checked:[&_span]:opacity-100 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-300"
                    >
                      <span className="size-2.5 rounded-full bg-brand-700 opacity-0 transition-opacity" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold capitalize">{role}</p>
                      <p className="text-xs text-muted-foreground">
                        {role === "seller" ? "List properties" : "Find properties"}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Min 8 chars" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Repeat password" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="agreeToTerms"
          render={({ field }) => (
            <FormItem className="group/field flex flex-row items-start gap-2.5 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="mt-0.5"
                />
              </FormControl>
              <div className="space-y-1.5">
                <FormLabel className="cursor-pointer text-sm leading-snug font-normal text-muted-foreground">
                  I agree to the{" "}
                  <Link
                    href={ROUTES.TERMS}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800"
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    href={ROUTES.PRIVACY}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800"
                  >
                    Privacy Policy
                  </Link>
                </FormLabel>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full bg-brand-600 text-white hover:bg-brand-700"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Creating account…" : "Create Account"}
        </Button>
      </form>
    </Form>
  )
}

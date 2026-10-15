"use client";

// import { Checkbox } from "@/components/ui/checkbox"; // DISABLED — "remember me" retired, see src/auth.ts header comment
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/config/routes.config";
import type { UserRole } from "@/types/user.types";
import { getDashboardRoute } from "@/utils/auth-helpers";
import { authService } from "@/services/auth.service";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LogIn, MailCheck, RotateCw } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FIELD_MESSAGE, Reveal, SubmitLabel } from "../_components/auth-motion";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  // rememberMe: z.boolean(), // DISABLED — everyone stays logged in now, see src/auth.ts header comment
});
type LoginInput = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">(
    "idle",
  );

  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data: LoginInput) {
    setError(null);
    setNeedsVerification(false);
    setResendState("idle");
    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (result?.error) {
      // Auth.js v5 surfaces CredentialsSignin.code (set in src/auth.ts) here.
      const code = (result as { code?: string }).code;
      const message =
        code && code !== "credentials" ? code : "Invalid email or password";
      setError(message);
      if (/verify your email/i.test(message)) setNeedsVerification(true);
      return;
    }

    // Fetch updated session to get role for redirect
    const { getSession } = await import("next-auth/react");
    const session = await getSession();
    const role = session?.user?.role as UserRole | undefined;
    const destination =
      callbackUrl ?? (role ? getDashboardRoute(role) : ROUTES.HOME);
    router.push(destination);
    router.refresh();
  }

  async function handleResend() {
    const email = form.getValues("email");
    if (!email) return;
    setResendState("sending");
    try {
      await authService.resendVerification(email);
    } catch {
      // resend endpoint never leaks existence; treat as sent regardless
    }
    setResendState("sent");
  }

  return (
    <div>
      <AnimatePresence initial={false}>
      {error && (
        <Reveal key="login-error" className="pb-4 sm:pb-5">
        <div role="alert" className="space-y-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <p>{error}</p>
          {needsVerification &&
            (resendState === "sent" ? (
              <p className="flex items-center gap-1.5 font-medium text-emerald-700">
                <MailCheck className="h-4 w-4" />
                Verification email sent. Check your inbox.
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={resendState === "sending"}
                className="glass-chip text-brand-800 disabled:opacity-60"
              >
                <RotateCw
                  className={`h-3.5 w-3.5 ${resendState === "sending" ? "animate-spin" : ""}`}
                />
                {resendState === "sending"
                  ? "Sending…"
                  : "Resend verification email"}
              </button>
            ))}
        </div>
        </Reveal>
      )}
      </AnimatePresence>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3.5 sm:space-y-4 md:[&_input:not([type=checkbox])]:h-10">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="gap-1.5">
                <FormLabel className="text-[0.8125rem] font-semibold text-ink-800">Email Address</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage className={FIELD_MESSAGE} />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <FormLabel className="text-[0.8125rem] font-semibold text-ink-800">Password</FormLabel>
                  <Link href={ROUTES.FORGOT_PASSWORD} className="glass-chip text-brand-800">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <FormControl>
                    <Input
                      type={showPass ? "text" : "password"}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="pr-11"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-ink-600 transition-[color,scale] hover:text-foreground active:scale-90 motion-reduce:active:scale-100"
                    aria-label={showPass ? "Hide password" : "Show password"}
                  >
                    {showPass ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <FormMessage className={FIELD_MESSAGE} />
              </FormItem>
            )}
          />

          {/* "Remember me" checkbox DISABLED — everyone stays logged in now.
          <FormField
            control={form.control}
            name="rememberMe"
            render={({ field }) => (
              <FormItem className="group/field flex flex-row items-center gap-2 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="cursor-pointer text-sm font-normal text-muted-foreground">
                  Remember me for 7 days
                </FormLabel>
              </FormItem>
            )}
          />
          */}

          <button
            type="submit"
            className="btn-tactile btn-tactile--block"
            disabled={form.formState.isSubmitting}
          >
            <SubmitLabel
              busy={form.formState.isSubmitting}
              idle={
                <>
                  <LogIn className="h-4 w-4" /> Sign In
                </>
              }
              busyLabel="Signing in…"
            />
          </button>
        </form>
      </Form>
    </div>
  );
}

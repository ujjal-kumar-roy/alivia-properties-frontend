"use client";

import { Button } from "@/components/ui/button";
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
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

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
    <div className="space-y-5">
      {error && (
        <div className="space-y-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          <p>{error}</p>
          {needsVerification &&
            (resendState === "sent" ? (
              <p className="flex items-center gap-1.5 font-medium text-emerald-700">
                <MailCheck className="h-4 w-4" />
                Verification email sent — check your inbox.
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={resendState === "sending"}
                className="inline-flex items-center gap-1.5 font-semibold text-brand-700 hover:underline disabled:opacity-60"
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
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
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
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Password</FormLabel>
                  <Link
                    href={ROUTES.FORGOT_PASSWORD}
                    className="inline-flex min-h-11 items-center text-xs text-brand-700 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPass ? "text" : "password"}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      {...field}
                      value={field.value ?? ""}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-1 top-1/2 flex -translate-y-1/2 cursor-pointer items-center justify-center text-muted-foreground hover:text-foreground"
                      aria-label={showPass ? "Hide password" : "Show password"}
                    >
                      {showPass ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
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

          <Button
            type="submit"
            className="w-full bg-brand-600 hover:bg-brand-700 text-white gap-2"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? (
              "Signing in…"
            ) : (
              <>
                <LogIn className="h-4 w-4" /> Sign In
              </>
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}

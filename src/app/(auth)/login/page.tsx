import Link from "next/link"
import { ROUTES } from "@/config/routes.config"
import { LoginForm } from "./login-form"

export default function LoginPage() {
  return (
    <>
      <div className="mb-4 text-center sm:mb-6">
        <h1 className="font-heading text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">Welcome back</h1>
        <p className="mt-0.5 text-[0.8125rem] text-ink-600 sm:text-sm">Sign in to your Alivia Properties account</p>
      </div>

      <LoginForm />

      <div className="mt-3 flex items-center justify-center gap-2 text-sm text-ink-600 sm:mt-4">
        Don&apos;t have an account?
        <Link href={ROUTES.REGISTER} className="glass-chip">
          Register
        </Link>
      </div>
    </>
  )
}

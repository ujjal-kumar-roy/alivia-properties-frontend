import Link from "next/link"
import { ROUTES } from "@/config/routes.config"
import { RegisterForm } from "./register-form"

export default function RegisterPage() {
  return (
    <>
      <div className="mb-4 text-center sm:mb-6">
        <h1 className="font-heading text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">Create an account</h1>
        <p className="mt-0.5 text-[0.8125rem] text-ink-600 sm:text-sm">Join Alivia Properties to list or find your perfect property</p>
      </div>

      <RegisterForm />

      <div className="mt-3 flex items-center justify-center gap-2 text-sm text-ink-600 sm:mt-4">
        Already have an account?
        <Link href={ROUTES.LOGIN} className="glass-chip">
          Sign in
        </Link>
      </div>
    </>
  )
}

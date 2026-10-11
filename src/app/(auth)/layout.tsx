import Link from "next/link"
import { siteConfig } from "@/config/site.config"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    // Phones: the card sits near the top so the keyboard never hides the form;
    // from sm it is centred like before.
    <div className="bg-brand-aurora flex min-h-dvh flex-col items-center justify-start px-4 pb-6 pt-4 sm:justify-center sm:p-4">
      {/* Logo */}
      <Link href="/" className="mb-3 flex min-h-11 items-center gap-2 rounded-full px-2 sm:mb-8">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-600">
          <span className="text-sm font-bold text-white">AP</span>
        </div>
        <span className="text-lg font-bold text-brand-700">
          {siteConfig.shortName}
          <span className="ml-0.5 text-gold-600">Properties</span>
        </span>
      </Link>

      {/* Card */}
      <div className="liquid-glass w-full max-w-md rounded-2xl border p-4 sm:p-8">
        {children}
      </div>

      <p className="mt-4 text-center text-xs text-ink-600 sm:mt-6">
        © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
      </p>
    </div>
  )
}

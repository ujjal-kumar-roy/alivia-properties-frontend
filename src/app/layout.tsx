import { auth } from "@/auth";
// import { SessionWatcher } from "@/components/layout/session-watcher"; // DISABLED — see src/components/layout/session-watcher.tsx
import { CookieConsentBanner } from "@/components/common/cookie-consent-banner";
import { defaultMetadata } from "@/config/seo.config";
import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import { Cinzel, Geist_Mono, Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = defaultMetadata;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${manrope.variable} ${geistMono.variable} ${cinzel.variable} h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-background text-foreground"
      >
        <a
          href="#main-content"
          className="sr-only z-1000 rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:outline-none focus:ring-2 focus:ring-gold-300"
        >
          Skip to main content
        </a>
        <CookieConsentBanner />
        <SessionProvider
          session={session}
          refetchInterval={5 * 60}
          refetchOnWindowFocus
        >
          {/* <SessionWatcher /> DISABLED — no session.error is produced anymore, see src/auth.ts */}
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}

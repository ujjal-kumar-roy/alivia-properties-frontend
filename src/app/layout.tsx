import { auth } from "@/auth";
// import { SessionWatcher } from "@/components/layout/session-watcher"; // DISABLED — see src/components/layout/session-watcher.tsx
import { CookieConsentBanner } from "@/components/common/cookie-consent-banner";
import { MotionProvider } from "@/components/providers/motion-provider";
import { defaultMetadata } from "@/config/seo.config";
import type { Metadata, Viewport } from "next";
import { SessionProvider } from "next-auth/react";
import { Cinzel, Geist_Mono, Manrope } from "next/font/google";
import Script from "next/script";
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

// Notch-safe on iPhones (env(safe-area-inset-*) needs viewport-fit=cover) and
// a light status-bar tint that matches the glass chrome.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f2faf6",
};

// Runs before first paint. Marks low-end phones (<=4GB RAM, <=4 cores or
// Save-Data) so the glass engine can skip per-card blur there; see
// html[data-glass="lite"] in globals.css. iOS exposes neither signal, so
// iPhones always get the full material.
const GLASS_TIER_SCRIPT = `(function(){try{var n=navigator,m=n.deviceMemory,c=n.hardwareConcurrency,s=n.connection&&n.connection.saveData;if((m&&m<=4)||(c&&c<=4)||s)document.documentElement.dataset.glass="lite"}catch(e){}})()`;

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
        <Script
          id="glass-tier"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: GLASS_TIER_SCRIPT }}
        />
        <a
          href="#main-content"
          className="sr-only z-1000 rounded-full bg-brand-700 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:px-4 focus:py-2 focus:outline-none focus:ring-2 focus:ring-gold-300"
        >
          Skip to main content
        </a>
        <CookieConsentBanner />
        <MotionProvider>
          <SessionProvider
            session={session}
            refetchInterval={5 * 60}
            refetchOnWindowFocus
          >
            {/* <SessionWatcher /> DISABLED — no session.error is produced anymore, see src/auth.ts */}
            {children}
          </SessionProvider>
        </MotionProvider>
      </body>
    </html>
  );
}

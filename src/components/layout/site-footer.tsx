import Link from "next/link"
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react"
import { siteConfig } from "@/config/site.config"
import { ROUTES } from "@/config/routes.config"

/* ── Inline SVG social icons (lucide-react v1.14 dropped these) ── */

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  )
}

function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
      <polygon fill="white" points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" />
    </svg>
  )
}

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  )
}

/* ── Data ── */

const QUICK_LINKS = [
  { label: "Home", href: ROUTES.HOME },
  { label: "Apartments", href: ROUTES.PROJECTS },
  { label: "Marketplace", href: ROUTES.MARKETPLACE },
  { label: "Consultation", href: ROUTES.CONSULTATION },
  { label: "Contact", href: ROUTES.CONTACT },
]

const SOCIALS = [
  { href: siteConfig.social.facebook, Icon: FacebookIcon, label: "Facebook" },
  { href: siteConfig.social.instagram, Icon: InstagramIcon, label: "Instagram" },
  { href: siteConfig.social.youtube, Icon: YoutubeIcon, label: "YouTube" },
  { href: siteConfig.social.linkedin, Icon: LinkedinIcon, label: "LinkedIn" },
] as const

/* ── Component ── */

export function SiteFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-ink-200 bg-ink-950 text-white">
      <div className="container-page py-8 md:py-10">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.8fr_1.1fr] lg:items-start">
          <div>
            <Link
              href={ROUTES.HOME}
              className="inline-flex min-h-11 items-center font-heading text-base font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
            >
              {siteConfig.shortName}
              <span className="ml-1 text-gold-400">Properties</span>
            </Link>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-400">
              {siteConfig.tagline}. Verified real estate support across Bangladesh.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <a
                href={`https://wa.me/${siteConfig.contact.whatsApp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-brand-600/40 bg-brand-700/20 px-4 text-sm font-semibold text-brand-200 transition-colors duration-200 hover:bg-brand-700/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
              >
                <MessageCircle aria-hidden="true" className="size-4" />
                WhatsApp
              </a>
              {SOCIALS.map(({ href, Icon, label }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex size-11 items-center justify-center rounded-full border border-white/10 text-ink-400 transition-colors duration-200 hover:border-brand-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          <nav aria-label="Footer navigation">
            <h2 className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
              Explore
            </h2>
            <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 sm:max-w-sm">
              {QUICK_LINKS.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="inline-flex min-h-11 items-center text-sm text-ink-400 transition-colors duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <address className="not-italic">
            <h2 className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
              Contact
            </h2>
            <ul className="mt-3 space-y-1 text-sm text-ink-400">
              <li>
                <a
                  href={`tel:${siteConfig.contact.phoneRaw}`}
                  className="inline-flex min-h-11 items-center gap-2 transition-colors duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                >
                  <Phone aria-hidden="true" className="size-4 text-brand-400" />
                  {siteConfig.contact.phone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${siteConfig.contact.email}`}
                  className="inline-flex min-h-11 items-center gap-2 break-all transition-colors duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                >
                  <Mail aria-hidden="true" className="size-4 shrink-0 text-brand-400" />
                  {siteConfig.contact.email}
                </a>
              </li>
              <li className="flex min-h-11 items-start gap-2 pt-2">
                <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand-400" />
                <span className="leading-relaxed">{siteConfig.contact.address}</span>
              </li>
            </ul>
          </address>
        </div>
      </div>

      <div className="border-t border-white/8">
        <div className="container-page flex flex-col gap-2 py-3 text-xs text-ink-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} <span className="text-ink-400">{siteConfig.name}</span>. All rights reserved.
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <Link href={ROUTES.PRIVACY} className="inline-flex min-h-11 items-center transition-colors duration-200 hover:text-ink-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300">
              Privacy
            </Link>
            <Link href={ROUTES.TERMS} className="inline-flex min-h-11 items-center transition-colors duration-200 hover:text-ink-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300">
              Terms
            </Link>
            <Link href={ROUTES.CONTACT} className="inline-flex min-h-11 items-center transition-colors duration-200 hover:text-ink-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300">
              Support
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

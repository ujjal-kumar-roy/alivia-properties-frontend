import Image from "next/image"
import Link from "next/link"
import {
  Briefcase,
  CheckCircle2,
  Clock,
  Languages,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CardFact } from "@/components/common/card-fact"
import { MobileActionBar } from "@/components/common/mobile-action-bar"
import { StarRating } from "@/components/common/star-rating"
import { PropertyCard } from "@/components/properties/property-card"
import { ReviewsSection } from "@/components/properties/reviews-section"
import { ROUTES } from "@/config/routes.config"
import type { Agent } from "@/types/agent.types"
import type { Property } from "@/types/property.types"

const SPECIALTY_LABEL: Record<string, string> = {
  residential: "Residential",
  commercial: "Commercial",
  land: "Land",
  luxury: "Luxury",
  rental: "Rental",
}

/**
 * One agent: cover, a profile card (photo, name, numbers, bio, specialties),
 * their live listings and reviews. On phones the contact actions live in the
 * floating action bar (call, WhatsApp, email), so the card keeps only what is
 * not an action. From md the contact block sits beside the profile.
 */
export function AgentProfile({ agent: a, listings }: { agent: Agent; listings: Property[] }) {
  const firstName = a.name.split(" ")[0]
  const whatsAppDigits = a.whatsApp?.replace(/\D/g, "")

  return (
    <div>
      <div className="relative h-28 w-full overflow-hidden bg-ink-100 sm:h-56">
        {a.coverImage && (
          <Image src={a.coverImage} alt="" fill sizes="100vw" className="object-cover" unoptimized priority />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-ink-900/60 to-transparent" />
      </div>

      <div className="container-page -mt-10 pb-6 sm:-mt-16 sm:pb-16">
        <div className="relative z-10 grid gap-3 rounded-2xl border border-black/5 bg-white p-3.5 shadow-(--shadow-card) sm:p-5 md:grid-cols-3 md:grid-rows-[auto_1fr] md:gap-4">
          <div className="flex items-start gap-3 md:col-span-2 md:gap-4">
            <Avatar className="size-16 ring-4 ring-white sm:size-20">
              {a.avatar && <AvatarImage src={a.avatar} />}
              <AvatarFallback>{a.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h1 className="font-heading text-xl font-bold leading-tight tracking-tight text-ink-900 sm:text-2xl">
                  {a.name}
                </h1>
                {a.isVerified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[0.6875rem] font-semibold text-brand-800">
                    <CheckCircle2 aria-hidden="true" className="size-3" /> Verified
                  </span>
                )}
                {a.isFeatured && (
                  <span className="rounded-full bg-gold-50 px-2 py-0.5 text-[0.6875rem] font-semibold text-gold-700">
                    Featured
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[0.8125rem] text-ink-600 sm:text-sm">
                {a.companyName ?? a.licenseNumber} · {a.yearsExperience} yrs experience
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                <StarRating value={a.rating} count={a.reviewCount} size="sm" showValue />
                <CardFact icon={Clock}>~{a.responseTimeHours}h reply</CardFact>
                <CardFact icon={Briefcase}>
                  {a.activeListings} live · {a.closedDeals} closed
                </CardFact>
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <p className="text-[0.9375rem] leading-relaxed text-ink-800">{a.bio}</p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {a.specialties.map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-brand-50 px-2.5 py-1 text-[0.6875rem] font-semibold text-brand-800"
                >
                  {SPECIALTY_LABEL[s] ?? s}
                </span>
              ))}
            </div>
          </div>

          <aside className="space-y-1.5 rounded-xl bg-ink-50 p-3 md:col-start-3 md:row-span-2 md:row-start-1 md:space-y-2 md:p-4">
            <p className="hidden text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-500 md:block">
              Contact
            </p>
            <a href={`tel:${a.phone}`} className="hidden min-h-9 items-center gap-2 text-sm text-ink-900 hover:text-brand-700 md:flex">
              <Phone aria-hidden="true" className="size-3.5" /> {a.phone}
            </a>
            {whatsAppDigits && (
              <a
                href={`https://wa.me/${whatsAppDigits}`}
                target="_blank"
                rel="noreferrer"
                className="hidden min-h-9 items-center gap-2 text-sm text-ink-900 hover:text-success md:flex"
              >
                <MessageCircle aria-hidden="true" className="size-3.5" /> WhatsApp
              </a>
            )}
            <a href={`mailto:${a.email}`} className="hidden min-h-9 items-center gap-2 text-sm text-ink-900 hover:text-brand-700 md:flex">
              <Mail aria-hidden="true" className="size-3.5" /> <span className="truncate">{a.email}</span>
            </a>
            <div className="space-y-1 text-xs text-ink-700 md:pt-2">
              <p className="flex items-start gap-1.5">
                <MapPin aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
                {a.serviceAreas.join(" · ")}
              </p>
              <p className="flex items-start gap-1.5">
                <Languages aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
                {a.languages.join(" · ")}
              </p>
            </div>
            <Link href={ROUTES.CONTACT} className="btn-tactile btn-tactile--sm btn-tactile--block mt-2 hidden md:flex">
              Request callback
            </Link>
          </aside>
        </div>

        <div className="mt-5 grid gap-5 sm:mt-8 sm:gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {listings.length > 0 && (
              <section>
                <h2 className="mb-2.5 font-heading text-lg font-bold text-ink-900 sm:mb-3 sm:text-2xl">
                  Listings by {firstName}
                </h2>
                <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-4">
                  {listings.map((p) => (
                    <PropertyCard key={p.id} property={p} />
                  ))}
                </div>
              </section>
            )}
          </div>
          <div>
            <ReviewsSection targetType="agent" targetId={a.id} />
          </div>
        </div>
      </div>

      {/* Phones: the contact actions stay one thumb-tap away. */}
      <MobileActionBar label={`Contact ${firstName}`}>
        <a href={`tel:${a.phone}`} className="btn-tactile btn-tactile--block flex-1">
          <Phone aria-hidden="true" className="size-4" />
          Call {firstName}
        </a>
        {whatsAppDigits && (
          <a
            href={`https://wa.me/${whatsAppDigits}`}
            target="_blank"
            rel="noreferrer"
            aria-label="WhatsApp"
            className="btn-glass size-11 shrink-0 p-0"
          >
            <MessageCircle aria-hidden="true" className="size-5" />
          </a>
        )}
        <a href={`mailto:${a.email}`} aria-label="Email" className="btn-glass size-11 shrink-0 p-0">
          <Mail aria-hidden="true" className="size-5" />
        </a>
      </MobileActionBar>
    </div>
  )
}

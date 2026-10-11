import { ConsultationForm } from "@/pages-sections/consultation/consultation-form"
import { Phone, MessageCircle, Clock } from "lucide-react"
import { siteConfig } from "@/config/site.config"

const WHATSAPP_URL = `https://wa.me/${siteConfig.contact.whatsApp}`

export default function ConsultationPage() {
  return (
    <div className="py-4 sm:py-8 lg:py-12">
      <div className="container-page">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 lg:gap-x-12 lg:gap-y-8">
          {/* Intro */}
          <header className="lg:col-span-2 lg:row-start-1">
            <p className="text-eyebrow mb-3 hidden sm:block">Book a Session</p>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl lg:text-4xl">
              Free Real Estate Consultation
            </h1>
            <p className="mt-1.5 line-clamp-2 text-[0.9375rem] leading-snug text-ink-600 sm:line-clamp-none sm:text-sm sm:leading-relaxed">
              Get personalized guidance from our experienced real estate advisors. Whether you are buying, investing, or looking for a site visit — we are here to help.
            </p>
          </header>

          {/* Phones: the two direct lines, above the form. */}
          <div className="grid grid-cols-2 gap-2 sm:hidden">
            <a href={`tel:${siteConfig.contact.phoneRaw}`} className="btn-glass gap-1.5 px-2 text-[0.8125rem]">
              <Phone aria-hidden="true" className="size-4" />
              Call
            </a>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="btn-glass gap-1.5 px-2 text-[0.8125rem]">
              <MessageCircle aria-hidden="true" className="size-4" />
              WhatsApp
            </a>
          </div>

          {/* Form */}
          <div className="lg:col-span-3 lg:col-start-3 lg:row-span-2 lg:row-start-1">
            <div className="rounded-2xl border border-black/5 bg-white p-3.5 shadow-(--shadow-card) sm:p-6">
              <h2 className="font-heading text-base font-semibold text-ink-900 sm:mb-5 sm:text-lg">
                Schedule Your Consultation
              </h2>
              <p className="mb-3 mt-0.5 flex items-center gap-1 text-[0.8125rem] font-medium text-ink-600 sm:hidden">
                <Clock aria-hidden="true" className="size-3.5 text-brand-600" />
                30 minutes, free
              </p>
              <ConsultationForm />
            </div>
          </div>

          {/* Details: full list from sm, the hours card only on phones (call and WhatsApp are above). */}
          <div className="space-y-4 lg:col-span-2 lg:row-start-2 lg:space-y-6">
            <ul className="hidden space-y-3 sm:block">
              {[
                { icon: Clock,          label: "Duration", value: "30 minutes (free)", href: null },
                { icon: Phone,          label: "Phone",    value: siteConfig.contact.phone, href: `tel:${siteConfig.contact.phoneRaw}` },
                { icon: MessageCircle,  label: "WhatsApp", value: "Message us directly", href: WHATSAPP_URL },
              ].map(({ icon: Icon, label, value, href }) => {
                const body = (
                  <>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50">
                      <Icon aria-hidden="true" className="size-4 text-brand-600" />
                    </span>
                    <span>
                      <span className="block text-xs text-ink-600">{label}</span>
                      <span className="block text-sm font-semibold text-ink-900">{value}</span>
                    </span>
                  </>
                )
                return (
                  <li key={label}>
                    {href ? (
                      <a
                        href={href}
                        target={href.startsWith("https") ? "_blank" : undefined}
                        rel="noopener noreferrer"
                        className="flex min-h-11 items-center gap-3 transition-colors hover:text-brand-700"
                      >
                        {body}
                      </a>
                    ) : (
                      <div className="flex min-h-11 items-center gap-3">{body}</div>
                    )}
                  </li>
                )
              })}
            </ul>

            <div className="space-y-1 rounded-2xl bg-ink-50 p-3.5 sm:space-y-2 sm:p-5">
              <p className="text-sm font-bold text-ink-900">Office Hours</p>
              <p className="text-sm text-ink-600">{siteConfig.contact.officeHours}</p>
              <p className="text-sm text-ink-600">{siteConfig.contact.address}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

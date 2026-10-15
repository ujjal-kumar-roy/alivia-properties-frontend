import { Phone, Mail, MapPin, Clock, MessageCircle } from "lucide-react"
import { siteConfig } from "@/config/site.config"
import { ContactForm } from "@/pages-sections/contact/contact-form"

const WHATSAPP_URL = `https://wa.me/${siteConfig.contact.whatsApp}`

/**
 * Contact details. `quick` rows are already one tap away in the phone action
 * row, so phones skip them in the list and keep only what is not covered
 * (alternate email, hours, address).
 */
const DETAILS = [
  { icon: Phone,          label: "Phone",           value: siteConfig.contact.phone,        href: `tel:${siteConfig.contact.phoneRaw}`, quick: true },
  { icon: Mail,           label: "Email",           value: siteConfig.contact.email,        href: `mailto:${siteConfig.contact.email}`, quick: true },
  { icon: Mail,           label: "Alternate Email", value: siteConfig.contact.emailAlt,     href: `mailto:${siteConfig.contact.emailAlt}`, quick: false },
  { icon: MessageCircle,  label: "WhatsApp",        value: "Message on WhatsApp",           href: WHATSAPP_URL, quick: true },
  { icon: Clock,          label: "Office Hours",    value: siteConfig.contact.officeHours,  href: null, quick: false },
  { icon: MapPin,         label: "Address",         value: siteConfig.contact.address,      href: null, quick: false },
]

export default function ContactUsPage() {
  return (
    <div className="py-4 sm:py-8 lg:py-12">
      <div className="container-page">
        {/* One grid, DOM order = phone order (intro, quick actions, form, details).
            From lg the intro and details stack in the left column beside the form. */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 lg:gap-x-12 lg:gap-y-8">
          <header className="enter-cascade lg:col-span-2 lg:row-start-1">
            <p className="text-eyebrow mb-3 hidden sm:block">Get in Touch</p>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl lg:text-4xl">
              Contact Us
            </h1>
            <p className="mt-1.5 line-clamp-2 text-[0.9375rem] leading-snug text-ink-600 sm:line-clamp-none sm:text-sm sm:leading-relaxed">
              Have a question about buying, selling, or renting? Our team is ready to help you find the perfect property solution.
            </p>
          </header>

          {/* Phones: the three fastest ways to reach us, 40px glass buttons. */}
          <div className="reveal-stagger grid grid-cols-3 gap-2 sm:hidden">
            <a href={`tel:${siteConfig.contact.phoneRaw}`} className="btn-glass gap-1.5 px-2 text-[0.8125rem]">
              <Phone aria-hidden="true" className="size-4" />
              Call
            </a>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="btn-glass gap-1.5 px-2 text-[0.8125rem]">
              <MessageCircle aria-hidden="true" className="size-4" />
              WhatsApp
            </a>
            <a href={`mailto:${siteConfig.contact.email}`} className="btn-glass gap-1.5 px-2 text-[0.8125rem]">
              <Mail aria-hidden="true" className="size-4" />
              Email
            </a>
          </div>

          <div className="lg:col-span-3 lg:col-start-3 lg:row-span-2 lg:row-start-1">
            <div className="rounded-2xl border border-black/5 bg-white p-3.5 shadow-(--shadow-card) sm:p-6">
              <h2 className="mb-3 font-heading text-base font-semibold text-ink-900 sm:mb-5 sm:text-lg">
                Send Us a Message
              </h2>
              <ContactForm />
            </div>
          </div>

          <ul className="reveal-stagger space-y-1 lg:col-span-2 lg:row-start-2 lg:space-y-4">
            {DETAILS.map(({ icon: Icon, label, value, href, quick }) => {
              const body = (
                <>
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50">
                    <Icon aria-hidden="true" className="size-4 text-brand-600" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs text-ink-600">{label}</span>
                    <span className="block text-[0.9375rem] font-medium text-ink-900">{value}</span>
                  </span>
                </>
              )
              const row = "flex min-h-12 items-center gap-3 rounded-xl"
              return (
                <li key={label} className={quick ? "hidden sm:block" : undefined}>
                  {href ? (
                    <a
                      href={href}
                      target={href.startsWith("https") ? "_blank" : undefined}
                      rel="noopener noreferrer"
                      className={`${row} transition-colors hover:text-brand-700 active:bg-brand-50`}
                    >
                      {body}
                    </a>
                  ) : (
                    <div className={`${row} items-start py-1.5`}>{body}</div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>

        {/* Map placeholder: desktop only, the address above already says it. */}
        <div className="mt-12 hidden h-64 items-center justify-center rounded-2xl border border-border bg-muted sm:flex">
          <div className="text-center text-muted-foreground">
            <MapPin className="mx-auto mb-2 h-8 w-8 opacity-40" />
            <p className="text-sm">Map · {siteConfig.contact.address}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

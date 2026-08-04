import { Phone, Mail, MapPin, Clock, MessageCircle } from "lucide-react"
import { siteConfig } from "@/config/site.config"
import { ContactForm } from "@/pages-sections/contact/contact-form"

export default function ContactUsPage() {
  return (
    <div className="section-y">
      <div className="container-page">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          {/* Left */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <p className="text-eyebrow mb-3">Get in Touch</p>
              <h1 className="text-h2 mb-3">Contact Us</h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Have a question about buying, selling, or renting? Our team is ready to help you find the perfect property solution.
              </p>
            </div>

            <div className="space-y-5">
              {[
                { icon: Phone,          label: "Phone",        value: siteConfig.contact.phone,   href: `tel:${siteConfig.contact.phoneRaw}` },
                { icon: Mail,           label: "Email",        value: siteConfig.contact.email,   href: `mailto:${siteConfig.contact.email}` },
                { icon: Mail,           label: "Alternate Email", value: siteConfig.contact.emailAlt, href: `mailto:${siteConfig.contact.emailAlt}` },
                { icon: MessageCircle,  label: "WhatsApp",     value: "Message on WhatsApp",      href: `https://wa.me/${siteConfig.contact.whatsApp}` },
                { icon: Clock,          label: "Office Hours", value: siteConfig.contact.officeHours, href: null },
                { icon: MapPin,         label: "Address",      value: siteConfig.contact.address, href: null },
              ].map(({ icon: Icon, label, value, href }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-brand-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    {href ? (
                      <a href={href} target={href.startsWith("https") ? "_blank" : undefined} rel="noopener noreferrer" className="text-sm font-medium hover:text-brand-700 transition-colors">
                        {value}
                      </a>
                    ) : (
                      <p className="text-sm font-medium">{value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl border border-border p-6 shadow-card">
              <h2 className="font-bold text-lg mb-6">Send Us a Message</h2>
              <ContactForm />
            </div>
          </div>
        </div>

        {/* Map placeholder */}
        <div className="mt-12 h-64 rounded-2xl bg-muted flex items-center justify-center border border-border">
          <div className="text-center text-muted-foreground">
            <MapPin className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Map · {siteConfig.contact.address}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

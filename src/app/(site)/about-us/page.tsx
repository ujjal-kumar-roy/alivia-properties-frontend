import Image from "next/image"
import { ShieldCheck, Building2, Users, Clock } from "lucide-react"
import { CountUp } from "@/components/common/count-up"
import { siteConfig } from "@/config/site.config"
import { StatsSection } from "@/pages-sections/home/stats-section"

const MILESTONES = [
  { year: "2011", title: "Company Founded",     description: "Alivia Properties established in Dhaka with a vision to transform Bangladesh real estate." },
  { year: "2013", title: "First Apartment",        description: "Delivered Alivia Gardens — our first completed residential apartment in Uttara." },
  { year: "2016", title: "Marketplace Launch",   description: "Launched the online property marketplace connecting buyers, sellers, and renters across Bangladesh." },
  { year: "2019", title: "1,000 Families",       description: "Reached the milestone of 1,000 happy families across our apartments and marketplace." },
  { year: "2022", title: "Digital Expansion",    description: "Launched our fully digital property listing and verification platform." },
  { year: "2025", title: "New Developments",     description: "Alivia Heights and Alivia Skyline announced as our most ambitious apartments to date." },
]

const PILLARS = [
  {
    icon: Building2,
    title: "Our Vision",
    body: "To become Bangladesh's most trusted and innovative real estate platform — making property ownership accessible, transparent, and rewarding for every Bangladeshi family.",
  },
  {
    icon: ShieldCheck,
    title: "Our Mission",
    body: "To provide verified, high-quality real estate services through transparent processes, expert guidance, and technology — ensuring every transaction is safe, fair, and efficient.",
  },
]

const TRUST = [
  { icon: ShieldCheck, label: "RAJUK Registered",  sub: "Fully compliant" },
  { icon: Building2,   label: "14+ Years",          sub: "In real estate",    count: 14,   suffix: "+ Years" },
  { icon: Users,       label: "1,800+ Families",    sub: "Served with pride", count: 1800, suffix: "+ Families" },
  { icon: Clock,       label: "12 Apartments",        sub: "Delivered on time", count: 12,   suffix: " Apartments" },
]

const SECTION_TITLE =
  "font-heading text-lg font-bold tracking-tight text-ink-900 sm:text-2xl md:text-3xl"

export default function AboutUsPage() {
  return (
    <>
      {/* Hero: title and two lines of copy on phones. */}
      <section className="bg-ink-900 py-5 text-white sm:py-14 md:py-20">
        <div className="enter-cascade container-page max-w-3xl text-center">
          <p className="text-eyebrow mb-3 hidden text-gold-400 sm:block">About Alivia Properties</p>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            Building Trust Since 2011
          </h1>
          <p className="mx-auto mt-2 line-clamp-2 max-w-2xl text-[0.9375rem] leading-snug text-ink-300 sm:mt-4 sm:line-clamp-none sm:text-lg sm:leading-relaxed">
            {siteConfig.description}
          </p>
        </div>
      </section>

      {/* Vision & Mission */}
      <section className="bg-white py-4 sm:py-10 md:py-14">
        <div className="container-page">
          <div className="reveal-stagger grid grid-cols-1 gap-2.5 md:grid-cols-2 md:gap-10">
            {PILLARS.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-2xl border border-black/5 bg-white p-3.5 shadow-(--shadow-card) md:space-y-3 md:border-0 md:p-0 md:shadow-none"
              >
                <div className="flex items-center gap-2.5 md:block">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 md:size-10">
                    <Icon aria-hidden="true" className="size-5 text-brand-600" />
                  </div>
                  <h2 className="font-heading text-base font-semibold text-ink-900 md:mt-3 md:text-2xl">{title}</h2>
                </div>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-600 md:mt-0 md:text-sm">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <StatsSection />

      {/* Founder */}
      <section className="bg-ink-50 py-5 sm:py-10 md:py-14">
        <div className="container-page">
          <p className="text-eyebrow mb-2 hidden text-center sm:block">Leadership</p>
          <h2 className={`${SECTION_TITLE} text-center`}>A Word from Our Founder</h2>
          <div className="reveal mx-auto mt-3 flex max-w-3xl items-start gap-3 rounded-2xl border border-black/5 bg-white p-3.5 shadow-(--shadow-card) sm:mt-8 sm:gap-8 sm:p-8">
            <div className="size-14 shrink-0 overflow-hidden rounded-full bg-muted sm:size-20">
              <Image
                src={siteConfig.founder.avatar}
                alt={siteConfig.founder.name}
                width={80}
                height={80}
                className="size-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <p className="mb-3 text-[0.9375rem] italic leading-relaxed text-ink-700 sm:mb-4 sm:text-sm">
                &ldquo;{siteConfig.founder.message}&rdquo;
              </p>
              <p className="text-sm font-bold text-ink-900">{siteConfig.founder.name}</p>
              <p className="text-xs text-brand-700">{siteConfig.founder.title}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="bg-white py-5 sm:py-10 md:py-14">
        <div className="container-page">
          <p className="text-eyebrow mb-2 hidden text-center sm:block">Our Journey</p>
          <h2 className={`${SECTION_TITLE} text-center`}>Milestones That Shaped Us</h2>
          <ol className="reveal-stagger relative mx-auto mt-4 max-w-2xl space-y-4 before:absolute before:bottom-2 before:left-4 before:top-2 before:w-px before:bg-border sm:mt-10 sm:space-y-8 sm:before:left-5">
            {MILESTONES.map(({ year, title, description }) => (
              <li key={year} className="relative pl-12 sm:pl-14">
                <span className="absolute left-0 top-0 flex size-8 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white sm:size-10">
                  {year.slice(2)}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold text-brand-700">{year}</span>
                  <h3 className="text-[0.9375rem] font-bold text-ink-900">{title}</h3>
                </div>
                <p className="mt-0.5 text-sm leading-snug text-ink-600">{description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Trust highlights */}
      <section className="bg-ink-50 py-5 sm:py-10 md:py-14">
        <div className="container-page">
          <ul className="reveal-stagger grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-6">
            {TRUST.map(({ icon: Icon, label, sub, count, suffix }) => (
              <li
                key={label}
                className="flex items-center gap-2.5 rounded-2xl bg-white p-3 shadow-(--shadow-card) md:flex-col md:bg-transparent md:p-0 md:text-center md:shadow-none"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 md:size-10">
                  <Icon aria-hidden="true" className="size-5 text-brand-600" />
                </span>
                <span className="min-w-0 md:space-y-1">
                  {count != null ? (
                    <span className="block text-sm font-bold text-ink-900" aria-label={label}>
                      <span aria-hidden="true">
                        <CountUp value={count} />
                        {suffix}
                      </span>
                    </span>
                  ) : (
                    <span className="block text-sm font-bold text-ink-900">{label}</span>
                  )}
                  <span className="block text-xs text-ink-600">{sub}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  )
}

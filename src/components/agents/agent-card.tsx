import Image from "next/image"
import Link from "next/link"
import { BadgeCheck, Briefcase, Clock, Handshake, MapPin, MessageCircle } from "lucide-react"
import { CardFact } from "@/components/common/card-fact"
import { StarRating } from "@/components/common/star-rating"
import { ROUTES } from "@/config/routes.config"
import type { Agent } from "@/types/agent.types"

interface AgentCardProps {
  agent: Agent
}

/**
 * Agent row: square photo on the left, name, company, areas, rating and the
 * numbers that matter (live listings, closed deals, reply time) on the right.
 * About 116px tall on phones so a screen shows five or six agents. Every value
 * is the agent's own data; nothing is invented.
 */
export function AgentCard({ agent }: AgentCardProps) {
  const areas =
    agent.serviceAreas.slice(0, 2).join(", ") +
    (agent.serviceAreas.length > 2 ? ` +${agent.serviceAreas.length - 2}` : "")
  const photo = agent.avatar

  return (
    <article
      data-card
      className="group relative min-w-0 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-(--shadow-card) transition-[translate,scale,box-shadow] duration-200 active:scale-[0.98] sm:hover:-translate-y-0.5 sm:hover:shadow-(--shadow-elevated) motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100"
    >
      <Link
        href={ROUTES.AGENT_DETAIL(agent.slug)}
        className="flex gap-2.5 rounded-[inherit] p-2 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-400 sm:gap-3 sm:p-3"
      >
        <div className="relative aspect-square w-25 shrink-0 self-start overflow-hidden rounded-xl bg-ink-100 sm:w-28">
          {photo ? (
            <Image
              src={photo}
              alt=""
              fill
              sizes="112px"
              unoptimized
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="grid size-full place-items-center bg-linear-to-br from-brand-500 to-brand-800 font-heading text-3xl font-bold text-white">
              {agent.name.charAt(0)}
            </div>
          )}
          {agent.isFeatured && (
            <span className="absolute inset-x-0 bottom-0 bg-gold-400 py-[3px] text-center text-[0.6875rem] font-bold uppercase tracking-wide text-brand-950">
              Featured
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="flex items-center gap-1 leading-tight">
            <span className="truncate font-heading text-[0.95rem] font-semibold text-ink-900 transition-colors group-hover:text-brand-700 sm:text-base">
              {agent.name}
            </span>
            {agent.isVerified && (
              <BadgeCheck aria-label="Verified agent" className="size-4 shrink-0 text-brand-600" />
            )}
          </h3>
          <p className="mt-0.5 truncate text-xs text-ink-600">
            {agent.companyName ?? agent.licenseNumber} · {agent.yearsExperience} yrs experience
          </p>
          {agent.serviceAreas.length > 0 && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-600">
              <MapPin aria-hidden="true" className="size-3 shrink-0" />
              <span className="truncate">{areas}</span>
            </p>
          )}

          <div className="mt-1 flex">
            <StarRating value={agent.rating} count={agent.reviewCount} size="sm" showValue />
          </div>

          <ul className="mt-1 flex flex-wrap gap-x-2.5 gap-y-0.5 text-xs">
            <li>
              <CardFact icon={Briefcase}>{agent.activeListings} live</CardFact>
            </li>
            <li>
              <CardFact icon={Handshake}>{agent.closedDeals} closed</CardFact>
            </li>
            <li>
              <CardFact icon={Clock}>~{agent.responseTimeHours}h reply</CardFact>
            </li>
            {agent.whatsApp && (
              <li className="hidden sm:block">
                <CardFact icon={MessageCircle}>WhatsApp</CardFact>
              </li>
            )}
          </ul>
        </div>
      </Link>
    </article>
  )
}

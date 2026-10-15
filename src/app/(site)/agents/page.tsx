import Link from "next/link"
import { getAgents } from "@/services/agents.service"
import { AgentCard } from "@/components/agents/agent-card"
import { GuideAvatar } from "@/components/common/guide-avatar"
import { ROUTES } from "@/config/routes.config"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Verified Agents — Alivia Properties",
  description: "Browse our verified property agents and brokers across Bangladesh.",
}

export default async function AgentsPage() {
  const res = await getAgents()
  const agents = res.data
  // Real average of the agents' own reply times; nothing is shown without agents.
  const avgReply = agents.length
    ? Math.round(agents.reduce((sum, a) => sum + a.responseTimeHours, 0) / agents.length)
    : null

  return (
    <div className="py-4 sm:py-8 lg:py-12">
      <div className="container-page">
        <header className="enter-cascade mb-3 sm:mb-6">
          <p className="text-eyebrow mb-1 hidden sm:block">Our Agents</p>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl lg:text-4xl">
            Verified property professionals
          </h1>
          {avgReply != null && (
            <p className="mt-1 text-[0.8125rem] text-ink-600 sm:text-sm">
              {agents.length} {agents.length === 1 ? "agent" : "agents"} · Avg reply about {avgReply}h
            </p>
          )}
        </header>

        {agents.length > 0 ? (
          <ul className="reveal-stagger grid gap-2.5 md:grid-cols-2 md:gap-3 lg:grid-cols-3">
            {agents.map((a) => (
              <li key={a.id} className="min-w-0">
                <AgentCard agent={a} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl border border-black/5 bg-white p-3.5 shadow-(--shadow-card) sm:p-6">
            <div className="flex items-center gap-3">
              <GuideAvatar mood="idle" size={48} />
              <p className="speech-bubble min-w-0 flex-1 px-3 py-2 text-[0.9375rem]">
                Our verified agents are joining soon. Browse listings or ask us directly in the meantime.
              </p>
            </div>
            <div className="mt-3.5 flex flex-wrap gap-2">
              <Link href={ROUTES.PROPERTIES} className="btn-tactile btn-tactile--sm flex-1 sm:flex-none">
                Browse properties
              </Link>
              <Link href={ROUTES.CONTACT} className="btn-glass flex-1 sm:flex-none">
                Talk to us
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

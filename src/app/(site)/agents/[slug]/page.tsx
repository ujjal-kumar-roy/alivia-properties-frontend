import { notFound } from "next/navigation"
import { AgentProfile } from "@/components/agents/agent-profile"
import { getAgent } from "@/services/agents.service"
import { getProperties } from "@/services/properties.service"

export const dynamic = "force-dynamic"

export default async function AgentDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const res = await getAgent(slug).catch(() => null)
  if (!res?.data) return notFound()
  const a = res.data

  const listings = await getProperties({ sellerId: a.id, limit: 6 }).catch(() => null)

  return <AgentProfile agent={a} listings={listings?.data ?? []} />
}

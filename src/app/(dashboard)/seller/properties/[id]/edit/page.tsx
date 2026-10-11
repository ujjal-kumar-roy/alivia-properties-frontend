export const dynamic = "force-dynamic"

import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { auth } from "@/auth"
import { getProperties, getPropertyById } from "@/services/properties.service"
import { PropertyForm } from "@/components/forms/property-form"
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header"
import { Button } from "@/components/ui/button"
import { ROUTES } from "@/config/routes.config"
import { getCurrentSeller } from "@/utils/dashboard-session"

interface SellerEditPropertyPageProps {
  params: Promise<{ id: string }>
}

export default async function SellerEditPropertyPage({ params }: SellerEditPropertyPageProps) {
  const { id } = await params
  const seller = await getCurrentSeller()
  const session = await auth()
  const property = await getPropertyById(id, session?.accessToken)
    .catch(async () => {
      const fallback = await getProperties({ sellerId: seller.id, limit: 100 }, session?.accessToken)
        .then((response) => response.data.find((item) => item.id === id) ?? null)
        .catch(() => null)

      if (!fallback) throw new Error("Property lookup failed")
      return fallback
    })
    .then((data) => ({ success: true as const, data }))
    .catch(() => ({ success: false as const, data: null }))

  if (!property.success) notFound()
  if (property.data.sellerId !== seller.id) notFound()

  return (
    <div className="space-y-3 sm:space-y-6">
      <DashboardPageHeader
        title="Edit Property"
        description="Edit your listing details and availability."
        actions={(
          <Button variant="outline" className="rounded-full" render={<Link href={ROUTES.SELLER_PROPERTIES} />}>
            <ChevronLeft className="h-4 w-4" />
            Back to Listings
          </Button>
        )}
      />

      <PropertyForm mode="edit" initialProperty={property.data} />
    </div>
  )
}

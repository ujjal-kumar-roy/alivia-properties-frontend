import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { PropertyForm } from "@/components/forms/property-form"
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header"
import { Button } from "@/components/ui/button"
import { ROUTES } from "@/config/routes.config"
import { getCurrentSeller } from "@/utils/dashboard-session"

export default async function SellerCreatePropertyPage() {
  const seller = await getCurrentSeller()

  return (
    <div className="space-y-3 sm:space-y-6">
      <DashboardPageHeader
        title="Add Property"
        description="Add a new property listing to the marketplace."
        actions={(
          <Button variant="outline" className="rounded-full" render={<Link href={ROUTES.SELLER_PROPERTIES} />}>
            <ChevronLeft className="h-4 w-4" />
            Back to Listings
          </Button>
        )}
      />

      <PropertyForm
        mode="create"
        contactDefaults={{
          name: seller.name,
          phone: (seller.phone ?? "").replace(/-/g, ""),
          whatsApp: seller.whatsApp,
        }}
      />
    </div>
  )
}

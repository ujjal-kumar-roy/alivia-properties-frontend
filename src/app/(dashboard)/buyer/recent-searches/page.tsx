import Link from "next/link"
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header"
import { Button } from "@/components/ui/button"
import { ROUTES } from "@/config/routes.config"
import { RecentSearchesView } from "@/pages-sections/buyer/buyer-views"

export default async function BuyerRecentSearchesPage() {

  return (
    <div>
      <DashboardPageHeader
        title="Recent Searches"
        description="Your recent property searches, ready to run again."
        actions={(
          <Button variant="outline" className="rounded-full" render={<Link href={ROUTES.PROPERTIES} />}>Search Listings</Button>
        )}
      />
      <RecentSearchesView />
    </div>
  )
}

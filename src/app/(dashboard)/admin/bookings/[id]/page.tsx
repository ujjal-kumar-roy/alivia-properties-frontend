export const dynamic = "force-dynamic"

import { notFound } from "next/navigation"

import { auth } from "@/auth"
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header"
import { ROUTES } from "@/config/routes.config"
import { BookingDetailPanel } from "@/pages-sections/bookings/booking-detail-panel"
import { getBooking } from "@/services/bookings.service"

type AdminBookingDetailPageProps = {
  params: Promise<{ id: string }>
}

export default async function AdminBookingDetailPage({
  params,
}: AdminBookingDetailPageProps) {
  const session = await auth()
  const { id } = await params
  const booking = await getBooking(id).catch(() => null)

  if (!session?.user || !booking) notFound()

  return (
    <div className="space-y-3 sm:space-y-5">
      <DashboardPageHeader
        className="max-sm:hidden"
        title="Booking detail"
        description="Review the requested appointment and update its lifecycle."
      />
      <BookingDetailPanel
        booking={booking}
        token={session.accessToken}
        backHref={ROUTES.ADMIN_BOOKINGS}
      />
    </div>
  )
}

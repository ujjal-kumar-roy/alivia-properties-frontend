export const dynamic = "force-dynamic"

import Link from "next/link"
import { GalleryHorizontal, Plus } from "lucide-react"
import { auth } from "@/auth"
import { heroService } from "@/services/hero.service"
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header"
import { HeroSlidesManager } from "@/components/dashboard/hero-slides-manager"
import { ROUTES } from "@/config/routes.config"

export default async function AdminHeroSlidesPage() {
  const session = await auth()
  const slides = await heroService.adminList(session?.accessToken).catch(() => [])

  return (
    <div>
      <DashboardPageHeader
        icon={GalleryHorizontal}
        eyebrow="Content"
        title="Hero Carousel"
        description="Control every slide on the marketplace hero — copy, image, buttons, order, and visibility."
        actions={(
          <Link href={ROUTES.ADMIN_HERO_SLIDE_CREATE} className="btn-tactile btn-tactile--sm">
            <Plus className="size-4" />
            Add slide
          </Link>
        )}
      />
      <HeroSlidesManager initialSlides={slides} />
    </div>
  )
}

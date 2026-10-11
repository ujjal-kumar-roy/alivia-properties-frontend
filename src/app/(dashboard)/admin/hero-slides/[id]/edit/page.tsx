export const dynamic = "force-dynamic"

import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { auth } from "@/auth"
import { heroService } from "@/services/hero.service"
import { HeroSlideForm } from "@/components/forms/hero-slide-form"
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header"
import { Button } from "@/components/ui/button"
import { ROUTES } from "@/config/routes.config"

interface AdminEditHeroSlidePageProps {
  params: Promise<{ id: string }>
}

export default async function AdminEditHeroSlidePage({ params }: AdminEditHeroSlidePageProps) {
  const { id } = await params
  const session = await auth()
  const slide = await heroService.byId(id, session?.accessToken).catch(() => null)

  if (!slide) notFound()

  return (
    <div className="space-y-3 sm:space-y-6">
      <DashboardPageHeader
        eyebrow="Content"
        title="Edit slide"
        description={`Update "${slide.title}".`}
        actions={(
          <Button variant="outline" className="rounded-full" render={<Link href={ROUTES.ADMIN_HERO_SLIDES} />}>
            <ChevronLeft className="h-4 w-4" />
            Back to Hero Carousel
          </Button>
        )}
      />
      <HeroSlideForm mode="edit" initialSlide={slide} />
    </div>
  )
}

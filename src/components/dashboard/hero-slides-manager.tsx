"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useSession } from "next-auth/react"
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  ImageIcon,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/common/empty-state"
import { heroService } from "@/services/hero.service"
import { resolveHeroIcon } from "@/lib/hero-icons"
import { ROUTES } from "@/config/routes.config"
import { cn } from "@/lib/utils"
import type { HeroSlide } from "@/types/hero.types"

export function HeroSlidesManager({ initialSlides }: { initialSlides: HeroSlide[] }) {
  const { data: session } = useSession()
  const token = session?.accessToken
  const [slides, setSlides] = useState<HeroSlide[]>(initialSlides)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function toggleActive(slide: HeroSlide) {
    setError(null)
    setPendingId(slide.id)
    try {
      const updated = await heroService.setActive(slide.id, !slide.isActive, token)
      setSlides((prev) => prev.map((s) => (s.id === slide.id ? updated : s)))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update the slide")
    } finally {
      setPendingId(null)
    }
  }

  async function remove(slide: HeroSlide) {
    if (!window.confirm(`Delete the slide "${slide.title}"? This cannot be undone.`)) return
    setError(null)
    setPendingId(slide.id)
    try {
      await heroService.remove(slide.id, token)
      setSlides((prev) => prev.filter((s) => s.id !== slide.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete the slide")
    } finally {
      setPendingId(null)
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= slides.length) return
    const reordered = [...slides]
    ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]
    setSlides(reordered) // optimistic
    setError(null)
    setPendingId(reordered[target].id)
    try {
      const saved = await heroService.reorder(reordered.map((s) => s.id), token)
      setSlides(saved)
    } catch (e) {
      setSlides(slides) // revert
      setError(e instanceof Error ? e.message : "Could not reorder slides")
    } finally {
      setPendingId(null)
    }
  }

  if (slides.length === 0) {
    return (
      <EmptyState
        icon={ImageIcon}
        title="No hero slides yet"
        description="Add your first slide — until then the marketplace hero shows the built-in default slides."
      />
    )
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {error && (
        <div role="alert" className="rounded-[1rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <ul className="space-y-2.5 sm:space-y-3">
        {slides.map((slide, index) => {
          const Icon = resolveHeroIcon(slide.eyebrowIcon)
          const busy = pendingId === slide.id
          const moveButtons = (
            <>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={`Move "${slide.title}" up`}
                className="size-8 rounded-full"
                disabled={index === 0 || busy}
                onClick={() => move(index, -1)}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={`Move "${slide.title}" down`}
                className="size-8 rounded-full"
                disabled={index === slides.length - 1 || busy}
                onClick={() => move(index, 1)}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </>
          )
          return (
            <li
              key={slide.id}
              data-card
              className={cn(
                "surface-card p-3 sm:flex sm:items-center sm:gap-4 sm:p-4",
                !slide.isActive && "opacity-70",
              )}
            >
              <div className="flex items-center gap-3 sm:contents">
                {/* Reorder (sm and up: a column at the left edge) */}
                <div className="hidden shrink-0 flex-col gap-1 sm:flex">{moveButtons}</div>

                {/* Thumbnail */}
                <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-xl bg-brand-950 sm:w-40">
                  {slide.imageUrl ? (
                    <Image src={slide.imageUrl} alt="" fill unoptimized sizes="160px" className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-white/40">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  {slide.eyebrow ? (
                    <p className="flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-brand-700">
                      <Icon className="h-3.5 w-3.5" />
                      <span className="truncate">{slide.eyebrow}</span>
                    </p>
                  ) : null}
                  <p className="mt-0.5 line-clamp-2 text-sm font-semibold text-ink-900 sm:text-base">{slide.title}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs sm:mt-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold",
                        slide.isActive
                          ? "bg-green-50 text-green-700"
                          : "bg-ink-100 text-ink-600",
                      )}
                    >
                      {slide.isActive ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      {slide.isActive ? "Visible" : "Hidden"}
                    </span>
                    <span className="text-ink-500">Position {index + 1}</span>
                  </div>
                </div>
              </div>

              {/* Phones: reorder at the left, actions at the right. sm and up: actions only. */}
              <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-border/50 pt-2.5 sm:mt-0 sm:shrink-0 sm:border-0 sm:pt-0">
                <div className="flex gap-1 sm:hidden">{moveButtons}</div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full max-sm:h-9"
                    disabled={busy}
                    onClick={() => toggleActive(slide)}
                  >
                    {busy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : slide.isActive ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                    {slide.isActive ? "Hide" : "Show"}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={`Edit "${slide.title}"`}
                    className="size-9 rounded-full"
                    render={<Link href={ROUTES.ADMIN_HERO_SLIDE_EDIT(slide.id)} />}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={`Delete "${slide.title}"`}
                    className="size-9 rounded-full border-red-200 text-red-600 hover:bg-red-50"
                    disabled={busy}
                    onClick={() => remove(slide)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

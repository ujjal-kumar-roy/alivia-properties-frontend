"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { TouchFileUploader } from "@/components/dashboard/touch-file-uploader"
import { FormSection } from "@/components/dashboard/form-section"
import { FormActionBar } from "@/components/dashboard/form-action-bar"
import { heroSlideSchema, type HeroSlideInput, type HeroSlideSubmit } from "@/schemas/hero-slide.schema"
import { heroService } from "@/services/hero.service"
import { DEFAULT_HERO_ICON, HERO_ICONS, HERO_ICON_NAMES, type HeroIconName } from "@/lib/hero-icons"
import { ROUTES } from "@/config/routes.config"
import type { HeroSlide } from "@/types/hero.types"

const numInputValue = (v: unknown): string | number =>
  typeof v === "number" || typeof v === "string" ? v : ""

// Module-level so the resolved icon isn't a component created during render
// (mirrors the dashboard NavIcon pattern; keeps React Compiler happy).
function EyebrowIconMark({ name, className }: { name?: string | null; className?: string }) {
  const Icon =
    name && name in HERO_ICONS ? HERO_ICONS[name as HeroIconName] : HERO_ICONS[DEFAULT_HERO_ICON]
  return <Icon aria-hidden className={className} />
}

interface HeroSlideFormProps {
  mode: "create" | "edit"
  initialSlide?: HeroSlide
}

function getDefaults(initial?: HeroSlide): HeroSlideInput {
  return {
    eyebrow: initial?.eyebrow ?? "",
    eyebrowIcon: initial?.eyebrowIcon ?? "Sparkles",
    title: initial?.title ?? "",
    subtitle: initial?.subtitle ?? "",
    imageUrl: initial?.imageUrl ?? "",
    imageKey: initial?.imageKey ?? "",
    primaryLabel: initial?.primaryLabel ?? "",
    primaryHref: initial?.primaryHref ?? "",
    secondaryLabel: initial?.secondaryLabel ?? "",
    secondaryHref: initial?.secondaryHref ?? "",
    order: initial?.order,
    isActive: initial?.isActive ?? true,
  }
}

export function HeroSlideForm({ mode, initialSlide }: HeroSlideFormProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm<HeroSlideInput, undefined, HeroSlideSubmit>({
    resolver: zodResolver(heroSlideSchema),
    defaultValues: getDefaults(initialSlide),
  })

  // Live preview mirrors the public carousel as the admin types.
  const preview = useWatch({ control: form.control })
  const imageValue = useWatch({ control: form.control, name: "imageUrl" }) ?? ""

  async function onSubmit(values: HeroSlideSubmit) {
    setSubmitError(null)
    if (!session?.accessToken) {
      setSubmitError("Please sign in again to save this slide.")
      return
    }
    try {
      if (mode === "edit" && initialSlide) {
        await heroService.update(initialSlide.id, values, session.accessToken)
      } else {
        await heroService.create(values, session.accessToken)
      }
      router.push(ROUTES.ADMIN_HERO_SLIDES)
      router.refresh()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to save slide")
    }
  }

  return (
    <div className="space-y-3 sm:space-y-6">
      {submitError && (
        <div role="alert" className="rounded-[1rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 sm:space-y-6">
            {/* Background image */}
            <FormSection
              id="section-image"
              title="Background image"
              hint={imageValue ? "Photo added" : "Wide, high-resolution photo"}
              className="space-y-2"
            >
              <p className="hidden text-sm font-medium text-ink-800 md:block">Background image</p>
              <TouchFileUploader
                kind="project-image"
                label=""
                value={imageValue ? [imageValue] : []}
                onChange={(urls) => {
                  form.setValue("imageUrl", urls[0] ?? "", { shouldDirty: true })
                  form.setValue("imageKey", "", { shouldDirty: true })
                }}
                hint="Wide, high-resolution photo · shown full-bleed behind the copy · max 10 MB"
              />
            </FormSection>

            {/* Copy */}
            <FormSection
              id="section-copy"
              title="Copy"
              hint="Eyebrow, title, subtitle"
              className="grid grid-cols-1 gap-4 md:grid-cols-2"
            >
              <FormField
                control={form.control}
                name="eyebrow"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Eyebrow</FormLabel>
                    <FormControl>
                      <Input placeholder="New launch — booking open" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="eyebrowIcon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Eyebrow icon</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        value={field.value ?? "Sparkles"}
                        className="w-full rounded-[1rem] border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-400"
                      >
                        {HERO_ICON_NAMES.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Own a home in Bangladesh's fastest-growing address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="subtitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subtitle</FormLabel>
                      <FormControl>
                        <Textarea rows={3} placeholder="Pre-launch pricing on Alivia Riverside Towers — a limited number of units remain." {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </FormSection>

            {/* Buttons */}
            <FormSection
              id="section-buttons"
              title="Buttons"
              hint="Labels and links"
              defaultOpen={mode === "create"}
              className="grid grid-cols-1 gap-4 md:grid-cols-2"
            >
              <FormField
                control={form.control}
                name="primaryLabel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary button label</FormLabel>
                    <FormControl>
                      <Input placeholder="View the launch" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="primaryHref"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary button link</FormLabel>
                    <FormControl>
                      <Input placeholder="/projects" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="secondaryLabel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Secondary button label</FormLabel>
                    <FormControl>
                      <Input placeholder="Book a site visit" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="secondaryHref"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Secondary button link</FormLabel>
                    <FormControl>
                      <Input placeholder="/consultation" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormSection>

            {/* Placement */}
            <FormSection
              id="section-placement"
              title="Placement"
              hint="Order and visibility"
              defaultOpen={mode === "create"}
              className="grid grid-cols-1 gap-4 md:grid-cols-2"
            >
              <FormField
                control={form.control}
                name="order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order</FormLabel>
                    <FormControl>
                      <Input type="number" inputMode="numeric" placeholder="0" {...field} value={numInputValue(field.value)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Visibility</FormLabel>
                    <label className="flex min-h-11 items-center gap-3 rounded-[1rem] border border-border bg-white px-3 py-2">
                      <input
                        type="checkbox"
                        checked={field.value ?? true}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="size-6 shrink-0 accent-brand-600 lg:size-4"
                      />
                      <span className="text-sm text-ink-700">Show this slide on the marketplace hero</span>
                    </label>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormSection>

            {/* md and up: inline buttons. Phones: the floating bar below. */}
            <div className="hidden flex-wrap items-center gap-3 md:flex">
              <Button type="submit" className="rounded-full bg-brand-700 px-6 text-white hover:bg-brand-800" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : (
                  mode === "edit" ? "Update slide" : "Create slide"
                )}
              </Button>
              <Button type="button" variant="outline" className="rounded-full" onClick={() => router.push(ROUTES.ADMIN_HERO_SLIDES)}>
                Cancel
              </Button>
            </div>

            <FormActionBar
              label="Hero slide form actions"
              submitLabel={mode === "edit" ? "Update slide" : "Create slide"}
              submitting={form.formState.isSubmitting}
              onCancel={() => router.push(ROUTES.ADMIN_HERO_SLIDES)}
            />
          </form>
        </Form>

        {/* Live preview: a collapsible row on phones, always shown from md up */}
        <FormSection
          bare
          id="section-preview"
          title="Live preview"
          hint="How the slide looks on the marketplace"
          defaultOpen={false}
          className="xl:sticky xl:top-24 xl:self-start"
        >
          <p className="mb-2 hidden text-xs font-semibold uppercase tracking-[0.16em] text-ink-500 md:block">Live preview</p>
          <div className="relative min-h-72 overflow-hidden rounded-2xl border border-border bg-brand-950">
            {imageValue ? (
              <Image src={imageValue} alt="" fill unoptimized sizes="26rem" className="object-cover" />
            ) : null}
            <div aria-hidden className="absolute inset-0 bg-linear-to-t from-brand-950/92 via-brand-950/55 to-brand-950/25" />
            <div aria-hidden className="absolute inset-0 bg-linear-to-r from-brand-950/70 via-brand-950/10 to-transparent" />
            <div className="relative z-10 max-w-sm p-6 text-white">
              {preview.eyebrow ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-sm">
                  <EyebrowIconMark name={preview.eyebrowIcon} className="size-3 text-gold-300" />
                  {preview.eyebrow}
                </span>
              ) : null}
              <h3 className="mt-4 text-balance font-heading text-2xl font-bold leading-tight text-white">
                {preview.title || "Slide title appears here"}
              </h3>
              {preview.subtitle ? (
                <p className="mt-3 text-sm leading-relaxed text-white/85">{preview.subtitle}</p>
              ) : null}
              {(preview.primaryLabel || preview.secondaryLabel) ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {preview.primaryLabel ? (
                    <span className="rounded-full bg-gold-400 px-4 py-1.5 text-xs font-bold text-brand-950">{preview.primaryLabel}</span>
                  ) : null}
                  {preview.secondaryLabel ? (
                    <span className="rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white">{preview.secondaryLabel}</span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </FormSection>
      </div>
    </div>
  )
}

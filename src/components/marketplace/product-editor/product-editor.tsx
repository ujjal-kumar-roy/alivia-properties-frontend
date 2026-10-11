"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useForm, type FieldErrors } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import { FormActionBar } from "@/components/dashboard/form-action-bar"
import {
  emptyProductForm,
  productFormSchema,
  type ProductFormInput,
  type ProductFormValues,
} from "@/schemas/marketplace-product.schema"
import { BasicsSection } from "./sections/basics-section"
import { MediaSection } from "./sections/media-section"
import { SpecsSection } from "./sections/specs-section"
import { PricingSection } from "./sections/pricing-section"
import { PublishingSection } from "./sections/publishing-section"

const SECTIONS = [
  { id: "section-basics", label: "Basics" },
  { id: "section-media", label: "Media" },
  { id: "section-specs", label: "Specs & highlights" },
  { id: "section-pricing", label: "Variants & pricing" },
  { id: "section-publishing", label: "Commerce & publishing" },
]

export function ProductEditor({
  mode,
  supplierOptions,
  categoryOptions,
  defaultValues,
  onSubmit,
  submitting,
  submitError,
}: {
  mode: "create" | "edit"
  supplierOptions: { value: string; label: string }[]
  categoryOptions: { value: string; label: string }[]
  defaultValues: Partial<ProductFormInput>
  onSubmit: (values: ProductFormValues) => Promise<void>
  submitting: boolean
  submitError: string | null
}) {
  const router = useRouter()
  const errorRef = useRef<HTMLParagraphElement>(null)
  const form = useForm<ProductFormInput, undefined, ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: { ...emptyProductForm(), ...defaultValues },
  })

  // The save error sits at the top of the form on phones; bring it into view from the sticky bar.
  useEffect(() => {
    if (submitError) errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [submitError])

  function onInvalid(errors: FieldErrors<ProductFormInput>) {
    const first = Object.keys(errors)[0] as keyof ProductFormInput | undefined
    if (!first) return
    // Phone sections open themselves on the next render; focus the first bad field once they have.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        try {
          form.setFocus(first)
        } catch {
          // Not a focusable field: its error message is already visible.
        }
      }),
    )
  }

  useEffect(() => {
    if (!form.formState.isDirty) return
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [form.formState.isDirty])

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="grid grid-cols-1 gap-3 sm:gap-5 xl:grid-cols-[200px_1fr]">
        <nav className="sticky top-20 hidden h-fit flex-col gap-1 xl:flex">
          {SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="rounded-lg px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-50 hover:text-ink-900"
            >
              {section.label}
            </a>
          ))}
        </nav>

        <div className="space-y-3 pb-4 sm:space-y-5 md:pb-24">
          <BasicsSection control={form.control} supplierOptions={supplierOptions} categoryOptions={categoryOptions} />
          <MediaSection control={form.control} />
          <SpecsSection control={form.control} />
          <PricingSection control={form.control} />
          <PublishingSection control={form.control} />
        </div>

        {submitError ? (
          <p
            ref={errorRef}
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 max-md:order-first md:fixed md:inset-x-0 md:bottom-20 md:z-10 md:mx-auto md:w-fit md:rounded-lg md:py-2 xl:col-span-2"
          >
            {submitError}
          </p>
        ) : null}

        {/* md and up: the original save bar (clear of the sidebar from lg). Phones: the floating bar below. */}
        <div className="surface-panel fixed inset-x-0 bottom-0 z-10 hidden items-center justify-between gap-3 px-5 py-3 md:flex lg:left-72 xl:static xl:col-span-2 xl:rounded-2xl">
          <span className="text-xs text-ink-500">
            {form.formState.isDirty ? "Unsaved changes" : "No changes"}
          </span>
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {mode === "edit" ? "Save changes" : "Save product"}
            </Button>
          </div>
        </div>

        <FormActionBar
          label="Product form actions"
          submitLabel={mode === "edit" ? "Save changes" : "Save product"}
          submitting={submitting}
          onCancel={() => router.back()}
        />
      </form>
    </Form>
  )
}

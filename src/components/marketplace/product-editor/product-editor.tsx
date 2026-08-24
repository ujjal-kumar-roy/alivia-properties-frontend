"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
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
  const form = useForm<ProductFormInput, undefined, ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: { ...emptyProductForm(), ...defaultValues },
  })

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
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5 xl:grid-cols-[200px_1fr]">
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

        <div className="space-y-5 pb-24">
          <BasicsSection control={form.control} supplierOptions={supplierOptions} categoryOptions={categoryOptions} />
          <MediaSection control={form.control} />
          <SpecsSection control={form.control} />
          <PricingSection control={form.control} />
          <PublishingSection control={form.control} />
        </div>

        {submitError ? (
          <p className="fixed inset-x-0 bottom-20 z-10 mx-auto w-fit rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 xl:col-span-2">
            {submitError}
          </p>
        ) : null}

        <div className="surface-panel fixed inset-x-0 bottom-0 z-10 flex items-center justify-between gap-3 px-5 py-3 xl:col-span-2 xl:static xl:rounded-2xl">
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
      </form>
    </Form>
  )
}

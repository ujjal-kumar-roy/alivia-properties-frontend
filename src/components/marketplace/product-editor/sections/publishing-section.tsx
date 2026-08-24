"use client"

import { useFieldArray, type Control } from "react-hook-form"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import type { ProductFormInput } from "@/schemas/marketplace-product.schema"

export function PublishingSection({ control }: { control: Control<ProductFormInput> }) {
  const certifications = useFieldArray({ control, name: "certifications" as never })

  return (
    <fieldset id="section-publishing" className="surface-card scroll-mt-24 space-y-4 p-5 lg:p-6">
      <legend className="font-heading text-lg font-semibold text-ink-900">Commerce & publishing</legend>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField control={control} name="sku" render={({ field }) => (
          <FormItem><FormLabel>SKU</FormLabel><FormControl><Input placeholder="SKU…" {...field} /></FormControl></FormItem>
        )} />
        <FormField control={control} name="warranty" render={({ field }) => (
          <FormItem><FormLabel>Warranty</FormLabel><FormControl><Input placeholder="1 year manufacturer warranty…" {...field} /></FormControl></FormItem>
        )} />
        <FormField control={control} name="origin" render={({ field }) => (
          <FormItem><FormLabel>Origin</FormLabel><FormControl><Input placeholder="Made in Bangladesh…" {...field} /></FormControl></FormItem>
        )} />
        <FormField control={control} name="packaging" render={({ field }) => (
          <FormItem><FormLabel>Packaging</FormLabel><FormControl><Input placeholder="50 kg PP bag…" {...field} /></FormControl></FormItem>
        )} />
        <FormField control={control} name="order" render={({ field }) => (
          <FormItem><FormLabel>Sort order</FormLabel><FormControl><Input type="number" min={0} {...field} /></FormControl><FormMessage /></FormItem>
        )} />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-700">Certifications</p>
        {certifications.fields.map((row, index) => (
          <div key={row.id} className="flex items-center gap-1.5">
            <FormField control={control} name={`certifications.${index}` as `certifications.${number}`} render={({ field }) => (
              <FormItem className="flex-1"><FormControl><Input placeholder="BSTI / ISO 9001…" {...field} /></FormControl></FormItem>
            )} />
            <Button type="button" size="icon" variant="ghost" className="size-9 text-destructive" onClick={() => certifications.remove(index)} aria-label="Remove certification">
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => certifications.append("" as never)}>
          <Plus className="size-3.5" /> Add certification
        </Button>
      </div>

      <div className="flex flex-wrap gap-5 border-t border-border/60 pt-4">
        <FormField control={control} name="isActive" render={({ field }) => (
          <FormItem className="flex items-center gap-2">
            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
            <span className="text-sm text-ink-700">Published (visible to buyers)</span>
          </FormItem>
        )} />
        <FormField control={control} name="isFeatured" render={({ field }) => (
          <FormItem className="flex items-center gap-2">
            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
            <span className="text-sm text-ink-700">Featured</span>
          </FormItem>
        )} />
      </div>
    </fieldset>
  )
}

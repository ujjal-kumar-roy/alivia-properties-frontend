"use client"

import { useFieldArray, useFormState, type Control } from "react-hook-form"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FormSection } from "@/components/dashboard/form-section"
import { Checkbox } from "@/components/ui/checkbox"
import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import type { ProductFormInput } from "@/schemas/marketplace-product.schema"

export function PricingSection({ control }: { control: Control<ProductFormInput> }) {
  const variants = useFieldArray({ control, name: "variants" })
  const tiers = useFieldArray({ control, name: "priceTiers" })
  const { errors } = useFormState({ control })
  const invalid = (["variants", "priceTiers", "inStock"] as const).some((name) => Boolean(errors[name]))

  return (
    <FormSection
      id="section-pricing"
      title="Variants and pricing"
      hint={variants.fields.length > 0 ? `${variants.fields.length} variants` : "Optional: sizes and bulk prices"}
      defaultOpen={false}
      invalid={invalid}
      className="space-y-5"
    >
      <h2 className="hidden font-heading text-lg font-semibold text-ink-900 md:block">Variants & pricing</h2>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-700">Sizes & variants</p>
        {variants.fields.map((row, index) => (
          <div key={row.id} className="grid grid-cols-2 items-center gap-2 rounded-lg border border-border bg-white p-2 sm:flex sm:flex-wrap sm:gap-1.5 sm:px-2 sm:py-1.5">
            <FormField control={control} name={`variants.${index}.name`} render={({ field }) => (
              <FormItem className="col-span-2 min-w-37.5 flex-1"><FormControl><Input placeholder="Variant name…" className="h-8 text-sm" {...field} /></FormControl></FormItem>
            )} />
            <FormField control={control} name={`variants.${index}.unit`} render={({ field }) => (
              <FormItem><FormControl><Input placeholder="Unit…" className="h-8 text-sm sm:w-20" {...field} /></FormControl></FormItem>
            )} />
            <FormField control={control} name={`variants.${index}.sku`} render={({ field }) => (
              <FormItem><FormControl><Input placeholder="SKU…" className="h-8 text-sm sm:w-24" {...field} /></FormControl></FormItem>
            )} />
            <FormField control={control} name={`variants.${index}.price`} render={({ field }) => (
              <FormItem><FormControl><Input type="number" min={0} inputMode="numeric" placeholder="2500…" className="h-8 text-sm sm:w-24" {...field} /></FormControl></FormItem>
            )} />
            <Button type="button" size="icon" variant="ghost" className="size-8 justify-self-end text-destructive sm:justify-self-auto" onClick={() => variants.remove(index)} aria-label="Remove variant">
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => variants.append({ name: "", unit: "", sku: "", price: "", isActive: true })}>
          <Plus className="size-3.5" /> Add variant
        </Button>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-700">Bulk price tiers</p>
        {tiers.fields.map((row, index) => (
          <div key={row.id} className="grid grid-cols-2 gap-1.5 rounded-lg border border-border bg-white p-2 md:grid-cols-[100px_100px_120px_1fr_auto]">
            <FormField control={control} name={`priceTiers.${index}.minQty`} render={({ field }) => (
              <FormItem><FormControl><Input type="number" min={0} placeholder="Min qty…" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={control} name={`priceTiers.${index}.maxQty`} render={({ field }) => (
              <FormItem><FormControl><Input type="number" min={0} placeholder="Max qty…" {...field} /></FormControl></FormItem>
            )} />
            <FormField control={control} name={`priceTiers.${index}.price`} render={({ field }) => (
              <FormItem><FormControl><Input type="number" min={0} placeholder="Unit price…" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={control} name={`priceTiers.${index}.note`} render={({ field }) => (
              <FormItem className="col-span-2 md:col-span-1"><FormControl><Input placeholder="Note…" {...field} /></FormControl></FormItem>
            )} />
            <Button type="button" size="icon" variant="ghost" className="col-span-2 size-9 justify-self-end text-destructive md:col-span-1 md:justify-self-auto" onClick={() => tiers.remove(index)} aria-label="Remove price tier">
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => tiers.append({ minQty: "", maxQty: "", price: "", note: "" })}>
          <Plus className="size-3.5" /> Add price tier
        </Button>
      </div>

      <FormField
        control={control}
        name="inStock"
        render={({ field }) => (
          <FormItem>
            <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-ink-700">
              <Checkbox checked={field.value === "in"} onCheckedChange={(checked) => field.onChange(checked ? "in" : "out")} />
              In stock
            </label>
          </FormItem>
        )}
      />
    </FormSection>
  )
}

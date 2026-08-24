"use client"

import { useFieldArray, type Control } from "react-hook-form"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import type { ProductFormInput } from "@/schemas/marketplace-product.schema"

export function PricingSection({ control }: { control: Control<ProductFormInput> }) {
  const variants = useFieldArray({ control, name: "variants" })
  const tiers = useFieldArray({ control, name: "priceTiers" })

  return (
    <fieldset id="section-pricing" className="surface-card scroll-mt-24 space-y-5 p-5 lg:p-6">
      <legend className="font-heading text-lg font-semibold text-ink-900">Variants & pricing</legend>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-700">Sizes & variants</p>
        {variants.fields.map((row, index) => (
          <div key={row.id} className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-white px-2 py-1.5">
            <FormField control={control} name={`variants.${index}.name`} render={({ field }) => (
              <FormItem className="min-w-37.5 flex-1"><FormControl><Input placeholder="Variant name…" className="h-8 text-sm" {...field} /></FormControl></FormItem>
            )} />
            <FormField control={control} name={`variants.${index}.unit`} render={({ field }) => (
              <FormItem><FormControl><Input placeholder="Unit…" className="h-8 w-20 text-sm" {...field} /></FormControl></FormItem>
            )} />
            <FormField control={control} name={`variants.${index}.sku`} render={({ field }) => (
              <FormItem><FormControl><Input placeholder="SKU…" className="h-8 w-24 text-sm" {...field} /></FormControl></FormItem>
            )} />
            <FormField control={control} name={`variants.${index}.price`} render={({ field }) => (
              <FormItem><FormControl><Input type="number" min={0} placeholder="2500…" className="h-8 w-24 text-sm" {...field} /></FormControl></FormItem>
            )} />
            <Button type="button" size="icon" variant="ghost" className="size-8 text-destructive" onClick={() => variants.remove(index)} aria-label="Remove variant">
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
          <div key={row.id} className="grid gap-1.5 rounded-lg border border-border bg-white p-2 md:grid-cols-[100px_100px_120px_1fr_auto]">
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
              <FormItem><FormControl><Input placeholder="Note…" {...field} /></FormControl></FormItem>
            )} />
            <Button type="button" size="icon" variant="ghost" className="size-9 text-destructive" onClick={() => tiers.remove(index)} aria-label="Remove price tier">
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
          <FormItem className="flex items-center gap-2">
            <Checkbox checked={field.value === "in"} onCheckedChange={(checked) => field.onChange(checked ? "in" : "out")} />
            <span className="text-sm text-ink-700">In stock</span>
          </FormItem>
        )}
      />
    </fieldset>
  )
}

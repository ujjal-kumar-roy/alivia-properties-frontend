"use client"

import { useFieldArray, type Control } from "react-hook-form"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import type { ProductFormInput } from "@/schemas/marketplace-product.schema"

export function SpecsSection({ control }: { control: Control<ProductFormInput> }) {
  const specs = useFieldArray({ control, name: "specs" })
  const highlights = useFieldArray({ control, name: "highlights" as never })

  return (
    <fieldset id="section-specs" className="surface-card scroll-mt-24 space-y-5 p-5 lg:p-6">
      <legend className="font-heading text-lg font-semibold text-ink-900">Specifications & highlights</legend>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-700">Specifications</p>
        {specs.fields.map((row, index) => (
          <div key={row.id} className="grid gap-1.5 rounded-lg border border-border bg-white p-2 md:grid-cols-[1fr_1fr_100px_auto]">
            <FormField control={control} name={`specs.${index}.label`} render={({ field }) => (
              <FormItem><FormControl><Input placeholder="Label (Grade)…" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={control} name={`specs.${index}.value`} render={({ field }) => (
              <FormItem><FormControl><Input placeholder="Value (42.5N)…" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={control} name={`specs.${index}.unit`} render={({ field }) => (
              <FormItem><FormControl><Input placeholder="Unit…" {...field} /></FormControl></FormItem>
            )} />
            <Button type="button" size="icon" variant="ghost" className="size-9 text-destructive" onClick={() => specs.remove(index)} aria-label="Remove spec">
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => specs.append({ label: "", value: "", unit: "" })}>
          <Plus className="size-3.5" /> Add spec
        </Button>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-700">Highlights</p>
        {highlights.fields.map((row, index) => (
          <div key={row.id} className="flex items-center gap-1.5">
            <FormField control={control} name={`highlights.${index}` as `highlights.${number}`} render={({ field }) => (
              <FormItem className="flex-1"><FormControl><Input placeholder="Short selling point…" {...field} /></FormControl></FormItem>
            )} />
            <Button type="button" size="icon" variant="ghost" className="size-9 text-destructive" onClick={() => highlights.remove(index)} aria-label="Remove highlight">
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => highlights.append("" as never)}>
          <Plus className="size-3.5" /> Add highlight
        </Button>
      </div>
    </fieldset>
  )
}

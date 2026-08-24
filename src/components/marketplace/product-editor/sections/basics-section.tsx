"use client"

import type { Control } from "react-hook-form"
import { SearchableSelect } from "@/components/common/searchable-select"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { ProductFormInput } from "@/schemas/marketplace-product.schema"

export function BasicsSection({
  control,
  supplierOptions,
  categoryOptions,
}: {
  control: Control<ProductFormInput>
  supplierOptions: { value: string; label: string }[]
  categoryOptions: { value: string; label: string }[]
}) {
  return (
    <fieldset id="section-basics" className="surface-card scroll-mt-24 space-y-4 p-5 lg:p-6">
      <legend className="font-heading text-lg font-semibold text-ink-900">Basics</legend>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          control={control}
          name="supplierId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Supplier</FormLabel>
              <FormControl>
                <SearchableSelect
                  ariaLabel="Supplier"
                  placeholder="Select supplier"
                  searchPlaceholder="Search suppliers…"
                  value={field.value}
                  onChange={field.onChange}
                  options={supplierOptions}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="categorySlug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <FormControl>
                <SearchableSelect
                  ariaLabel="Category"
                  placeholder="Select category"
                  searchPlaceholder="Search categories…"
                  value={field.value}
                  onChange={field.onChange}
                  options={categoryOptions}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product name</FormLabel>
              <FormControl>
                <Input placeholder="Product line name…" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="brand"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Brand</FormLabel>
              <FormControl>
                <Input placeholder="Brand…" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="unit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unit</FormLabel>
              <FormControl>
                <Input placeholder="bag / ton / sft…" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Indicative price (BDT)</FormLabel>
              <FormControl>
                <Input type="number" min={0} inputMode="numeric" placeholder="2500…" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="moq"
          render={({ field }) => (
            <FormItem>
              <FormLabel>MOQ</FormLabel>
              <FormControl>
                <Input type="number" min={0} inputMode="numeric" placeholder="20…" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="leadTimeDays"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lead time (days)</FormLabel>
              <FormControl>
                <Input type="number" min={0} inputMode="numeric" placeholder="2…" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="badge"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Badge</FormLabel>
              <FormControl>
                <Input placeholder="Best seller / Fast moving…" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea placeholder="Buyer-facing product summary…" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </fieldset>
  )
}

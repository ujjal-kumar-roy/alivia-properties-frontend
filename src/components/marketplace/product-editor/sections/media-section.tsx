"use client"

import { useFieldArray, useFormState, type Control } from "react-hook-form"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TouchFileUploader } from "@/components/dashboard/touch-file-uploader"
import { FormSection } from "@/components/dashboard/form-section"
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import type { ProductFormInput } from "@/schemas/marketplace-product.schema"

export function MediaSection({ control }: { control: Control<ProductFormInput> }) {
  const { fields, append, remove } = useFieldArray({ control, name: "documents" })
  const { errors } = useFormState({ control })
  const invalid = (["image", "gallery", "videoUrl", "externalVideoUrl", "documents"] as const).some((name) =>
    Boolean(errors[name]),
  )

  return (
    <FormSection
      id="section-media"
      title="Media"
      hint="Thumbnail, gallery, video, documents"
      invalid={invalid}
      className="space-y-4"
    >
      <h2 className="hidden font-heading text-lg font-semibold text-ink-900 md:block">Media</h2>
      <FormField
        control={control}
        name="image"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Thumbnail (required)</FormLabel>
            <FormControl>
              <TouchFileUploader
                kind="category-image"
                hint="Card image · max 8 MB"
                value={field.value ? [field.value] : []}
                onChange={(urls) => field.onChange(urls[0] ?? "")}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="gallery"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Gallery</FormLabel>
            <FormControl>
              <TouchFileUploader
                kind="category-image"
                hint="Up to 12 photos · max 8 MB each"
                multiple
                maxFiles={12}
                value={field.value ?? []}
                onChange={field.onChange}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="videoUrl"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Video</FormLabel>
            <FormControl>
              <TouchFileUploader
                kind="property-video"
                hint="MP4 / WebM · max 60 MB"
                value={field.value ? [field.value] : []}
                onChange={(urls) => field.onChange(urls[0] ?? "")}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="externalVideoUrl"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Video link</FormLabel>
            <FormControl>
              <Input inputMode="url" placeholder="https://www.youtube.com/watch?v=…" {...field} value={field.value ?? ""} />
            </FormControl>
            <FormDescription>
              Optional. Paste a video link from YouTube, Facebook, Vimeo or any other site. Shown on the product page next to the photos.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-700">Documents</p>
        {fields.map((row, index) => (
          <div key={row.id} className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-white p-3 md:grid-cols-[1fr_1fr_auto]">
            <FormField
              control={control}
              name={`documents.${index}.label`}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder="Document label…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={`documents.${index}.url`}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <TouchFileUploader
                      kind="document"
                      value={field.value ? [field.value] : []}
                      onChange={(urls) => field.onChange(urls[0] ?? "")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="button" size="icon" variant="ghost" className="size-9 text-destructive max-md:justify-self-end" onClick={() => remove(index)} aria-label="Remove document">
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => append({ label: "", url: "" })}>
          <Plus className="size-3.5" /> Add document
        </Button>
      </div>
    </FormSection>
  )
}

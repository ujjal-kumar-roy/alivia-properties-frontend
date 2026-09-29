"use client"

import { useFieldArray, type Control } from "react-hook-form"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FileUploader } from "@/components/common/file-uploader"
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import type { ProductFormInput } from "@/schemas/marketplace-product.schema"

export function MediaSection({ control }: { control: Control<ProductFormInput> }) {
  const { fields, append, remove } = useFieldArray({ control, name: "documents" })

  return (
    <fieldset id="section-media" className="surface-card scroll-mt-24 space-y-4 p-5 lg:p-6">
      <legend className="font-heading text-lg font-semibold text-ink-900">Media</legend>
      <FormField
        control={control}
        name="image"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Thumbnail (required)</FormLabel>
            <FormControl>
              <FileUploader
                kind="category-image"
                label="Thumbnail"
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
              <FileUploader
                kind="category-image"
                label="Gallery"
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
              <FileUploader
                kind="property-video"
                label="Video"
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
          <div key={row.id} className="grid gap-2 rounded-lg border border-border bg-white p-3 md:grid-cols-[1fr_1fr_auto]">
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
                    <FileUploader
                      kind="document"
                      value={field.value ? [field.value] : []}
                      onChange={(urls) => field.onChange(urls[0] ?? "")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="button" size="icon" variant="ghost" className="size-9 text-destructive" onClick={() => remove(index)} aria-label="Remove document">
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => append({ label: "", url: "" })}>
          <Plus className="size-3.5" /> Add document
        </Button>
      </div>
    </fieldset>
  )
}

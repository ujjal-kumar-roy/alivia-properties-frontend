"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useFieldArray, useForm, useWatch, type FieldErrors } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { TouchFileUploader } from "@/components/dashboard/touch-file-uploader"
import { FormSection } from "@/components/dashboard/form-section"
import { FormActionBar } from "@/components/dashboard/form-action-bar"
import { PanoramaBuilder } from "@/components/forms/panorama-builder"
import { PropertyImagesUploader } from "@/components/forms/property-images-uploader"
import { projectSchema, type ProjectInput, type ProjectSubmit } from "@/schemas/project.schema"
import { createProject, updateProject } from "@/services/projects.service"
import { AMENITIES } from "@/data/amenities"
import { PROJECT_VIEW_OPTIONS } from "@/lib/project-views"
import { ROUTES } from "@/config/routes.config"
import type { Project } from "@/types/project.types"

const STATUS_OPTIONS = [
  { value: "upcoming", label: "Upcoming" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
] as const

const LAND_UNIT_OPTIONS = ["katha", "bigha", "shotangsho", "sqft"]

// Coerced-number fields type their value as `unknown` on the input side; render
// only string/number values (never an object) into the <input>.
const numInputValue = (v: unknown): string | number =>
  typeof v === "number" || typeof v === "string" ? v : ""

const NUMERIC_FIELDS = [
  { name: "totalFloors", label: "Total Floors" },
  { name: "totalUnits", label: "Total Units" },
  { name: "availableUnits", label: "Available Apartments" },
  { name: "soldUnits", label: "Sold Apartments" },
] as const

interface ProjectFormProps {
  mode: "create" | "edit"
  initialProject?: Project
}

function getDefaults(initial?: Project): ProjectInput {
  return {
    name: initial?.name ?? "",
    tagline: initial?.tagline ?? "",
    description: initial?.description ?? "",
    status: initial?.status ?? "upcoming",
    location: initial?.location ?? "",
    address: initial?.address ?? "",
    coverImageUrl: initial?.coverImageUrl ?? "",
    galleryImages: initial?.galleryImages ?? [],
    videos: initial?.videos ?? [],
    videoUrl: initial?.videoUrl ?? "",
    panorama: initial?.panoramaUrl ? [initial.panoramaUrl] : [],
    handoverDate: initial?.handoverDate ? initial.handoverDate.slice(0, 10) : "",
    landSize: initial?.landSize,
    landSizeUnit: initial?.landSizeUnit ?? "katha",
    totalFloors: initial?.totalFloors,
    totalUnits: initial?.totalUnits,
    availableUnits: initial?.availableUnits,
    soldUnits: initial?.soldUnits,
    priceFrom: initial?.priceFrom,
    priceTo: initial?.priceTo,
    amenities: initial?.amenities ?? [],
    units: (initial?.units ?? []).map((u) => ({
      name: u.name ?? u.type ?? "",
      bedrooms: u.bedrooms ?? 0,
      bathrooms: u.bathrooms ?? 0,
      size: u.size ?? 0,
      sizeUnit: u.sizeUnit ?? "sqft",
      price: u.price ?? u.priceFrom ?? 0,
      available: u.available ?? u.total ?? 0,
    })),
    views: (initial?.views ?? []).map((v) => ({
      name: v.name ?? "",
      pricePremium: v.pricePremium,
    })),
    developerName: initial?.developerName ?? "",
    nearbyLandmarks: (initial?.nearbyLandmarks ?? []).map((l) => ({
      name: l.name ?? "",
      group: l.group ?? "",
    })),
    isFeatured: initial?.isFeatured ?? false,
  }
}

export function ProjectForm({ mode, initialProject }: ProjectFormProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const errorRef = useRef<HTMLDivElement>(null)

  const form = useForm<ProjectInput, undefined, ProjectSubmit>({
    resolver: zodResolver(projectSchema),
    defaultValues: getDefaults(initialProject),
  })

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "units" })
  const {
    fields: viewFields,
    append: appendView,
    remove: removeView,
  } = useFieldArray({ control: form.control, name: "views" })
  const {
    fields: landmarkFields,
    append: appendLandmark,
    remove: removeLandmark,
  } = useFieldArray({ control: form.control, name: "nearbyLandmarks" })
  const coverValue = useWatch({ control: form.control, name: "coverImageUrl" })
  const galleryValue = useWatch({ control: form.control, name: "galleryImages" }) ?? []
  const videoValues = useWatch({ control: form.control, name: "videos" }) ?? []
  const panoramaValues = useWatch({ control: form.control, name: "panorama" }) ?? []
  const selectedAmenities = useWatch({ control: form.control, name: "amenities" }) ?? []

  // Phones fold the form into sections; one with a validation error opens itself.
  const errs = form.formState.errors
  const hasError = (...names: (keyof ProjectInput)[]) => names.some((name) => Boolean(errs[name]))

  // A save error is shown at the top of the form; bring it into view from the sticky Save bar.
  useEffect(() => {
    if (submitError) errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [submitError])

  function onInvalid(errors: FieldErrors<ProjectInput>) {
    const first = Object.keys(errors)[0] as keyof ProjectInput | undefined
    if (!first) return
    // Sections open on the next render; focus the first bad field once they have.
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

  async function onSubmit(values: ProjectSubmit) {
    setSubmitError(null)
    if (!session?.accessToken) {
      setSubmitError("Please sign in again to save this apartment.")
      return
    }
    try {
      if (mode === "edit" && initialProject) {
        await updateProject(initialProject.id, values, session.accessToken)
      } else {
        await createProject(values, session.accessToken)
      }
      router.push(ROUTES.ADMIN_PROJECTS)
      router.refresh()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to save apartment")
    }
  }

  return (
    <div className="space-y-3 sm:space-y-6">
      {submitError && (
        <div
          ref={errorRef}
          role="alert"
          className="rounded-[1rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {submitError}
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-3 sm:space-y-6">
          {/* Basics */}
          <FormSection
            id="section-basics"
            title="Basics"
            hint="Name, description, status"
            invalid={hasError("name", "tagline", "description", "status", "developerName")}
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            <div className="md:col-span-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apartment Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Alivia Skyline Residences" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="md:col-span-2">
              <FormField
                control={form.control}
                name="tagline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tagline</FormLabel>
                    <FormControl>
                      <Input placeholder="Lakefront living in the heart of Bashundhara" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="md:col-span-2">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea rows={6} placeholder="Describe the apartment vision, location advantages, and what makes it stand out…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <FormControl>
                    <select {...field} className="w-full rounded-[1rem] border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-400">
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="developerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Developer</FormLabel>
                  <FormControl>
                    <Input placeholder="Alivia Properties Ltd." {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormSection>

          {/* Location */}
          <FormSection
            id="section-location"
            title="Location"
            hint="Area and address"
            defaultOpen={mode === "create"}
            invalid={hasError("location", "address")}
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="Bashundhara R/A, Dhaka" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Block J, Bashundhara R/A, Dhaka 1229"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(event) => {
                        field.onChange(event)
                        void form.trigger("address")
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormSection>

          {/* Timeline, size & pricing */}
          <FormSection
            id="section-timeline"
            title="Timeline, size and pricing"
            hint="Handover, land, units, price range"
            defaultOpen={mode === "create"}
            invalid={hasError("handoverDate", "landSize", "landSizeUnit", "totalFloors", "totalUnits", "availableUnits", "soldUnits", "priceFrom", "priceTo")}
            className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4"
          >
            <FormField
              control={form.control}
              name="handoverDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Handover Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="landSize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Land Size</FormLabel>
                  <FormControl>
                    <Input type="number" inputMode="decimal" placeholder="25" {...field} value={numInputValue(field.value)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="landSizeUnit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Land Unit</FormLabel>
                  <FormControl>
                    <select {...field} className="w-full rounded-[1rem] border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-400">
                      {LAND_UNIT_OPTIONS.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {NUMERIC_FIELDS.map((f) => (
              <FormField
                key={f.name}
                control={form.control}
                name={f.name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{f.label}</FormLabel>
                    <FormControl>
                      <Input type="number" inputMode="numeric" placeholder="0" {...field} value={numInputValue(field.value)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            <FormField
              control={form.control}
              name="priceFrom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price From (BDT)</FormLabel>
                  <FormControl>
                    <Input type="number" inputMode="numeric" placeholder="12000000" {...field} value={numInputValue(field.value)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="priceTo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price To (BDT)</FormLabel>
                  <FormControl>
                    <Input type="number" inputMode="numeric" placeholder="45000000" {...field} value={numInputValue(field.value)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormSection>

          {/* Media */}
          <FormSection
            id="section-media"
            title="Media"
            hint="Cover, gallery, videos, 360 tour"
            defaultOpen={mode === "create"}
            invalid={hasError("coverImageUrl", "galleryImages", "videos", "videoUrl", "panorama")}
            className="space-y-6"
          >
            <h2 className="hidden text-lg font-semibold text-ink-900 md:block">Media</h2>
            <div className="space-y-2">
              <p className="text-sm font-medium text-ink-800">Cover image</p>
              <TouchFileUploader
                kind="project-image"
                label=""
                value={coverValue ? [coverValue] : []}
                onChange={(urls) =>
                  form.setValue("coverImageUrl", urls[0] ?? "", { shouldDirty: true })
                }
                hint="Shown on cards and the apartment hero · max 10 MB"
              />
            </div>
            <div className="space-y-2">
              <PropertyImagesUploader
                kind="project-image"
                label="Gallery"
                value={galleryValue}
                onChange={(urls) =>
                  form.setValue("galleryImages", urls, { shouldValidate: true, shouldDirty: true })
                }
                minImages={3}
                maxImages={16}
              />
              {form.formState.errors.galleryImages?.message && (
                <p className="text-sm text-red-600">{form.formState.errors.galleryImages.message}</p>
              )}
            </div>

            {/* Video — upload a walkthrough clip and/or paste an external link */}
            <div className="grid grid-cols-1 gap-5 border-t border-border pt-6 md:grid-cols-2">
              <div className="space-y-2">
                <TouchFileUploader
                  kind="project-video"
                  multiple
                  maxFiles={3}
                  label="Apartment videos (optional)"
                  hint="Up to 3 clips · max 125 MB each (mp4, webm, mov)"
                  value={videoValues}
                  onChange={(urls) =>
                    form.setValue("videos", urls, { shouldValidate: true, shouldDirty: true })
                  }
                />
                {form.formState.errors.videos?.message && (
                  <p className="text-sm text-red-600">{form.formState.errors.videos.message}</p>
                )}
              </div>

              <FormField
                control={form.control}
                name="videoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>External video link (optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://youtube.com/watch?v=…"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-2 border-t border-border pt-6">
              <TouchFileUploader
                kind="project-image"
                label="360° Panorama (optional)"
                hint="One equirectangular (2:1) photo powers the interactive virtual tour · max 10 MB"
                value={panoramaValues}
                onChange={(urls) =>
                  form.setValue("panorama", urls.slice(0, 1), { shouldValidate: true, shouldDirty: true })
                }
              />
              {form.formState.errors.panorama?.message && (
                <p className="text-sm text-red-600">{form.formState.errors.panorama.message}</p>
              )}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-500">
                <span>Upload a 360° equirectangular shot (a 2:1 image, e.g. 4096×2048) — or</span>
                <PanoramaBuilder
                  kind="project-image"
                  galleryUrls={galleryValue}
                  onBuilt={(url) => form.setValue("panorama", [url], { shouldValidate: true, shouldDirty: true })}
                />
                <span>from your apartment photos. Leave empty for the sample tour.</span>
              </div>
            </div>
          </FormSection>

          {/* Amenities */}
          <FormSection
            id="section-amenities"
            title="Amenities"
            hint={selectedAmenities.length > 0 ? `${selectedAmenities.length} selected` : "Pick what the building offers"}
            defaultOpen={false}
            invalid={hasError("amenities")}
          >
            <h2 className="hidden text-lg font-semibold text-ink-900 md:block">Amenities</h2>
            <div className="mt-2 grid gap-2 md:mt-4 md:grid-cols-2 xl:grid-cols-3">
              {AMENITIES.map((category) => (
                <div key={category.category} className="rounded-[1.25rem] border border-border bg-ink-50 p-3 sm:p-4">
                  <p className="text-sm font-semibold text-ink-900">{category.category}</p>
                  <div className="mt-2 grid grid-cols-2 gap-x-3 sm:mt-3 sm:block sm:space-y-2">
                    {category.items.map((amenity) => (
                      <label key={amenity} className="flex min-h-10 items-center gap-2 text-sm text-ink-700 lg:min-h-0">
                        <input
                          type="checkbox"
                          checked={selectedAmenities.includes(amenity)}
                          onChange={(e) => {
                            const current = form.getValues("amenities") ?? []
                            form.setValue(
                              "amenities",
                              e.target.checked
                                ? [...current, amenity]
                                : current.filter((a) => a !== amenity),
                              { shouldDirty: true },
                            )
                          }}
                          className="size-6 shrink-0 accent-brand-600 lg:size-4"
                        />
                        {amenity}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </FormSection>

          {/* Unit types */}
          <FormSection
            id="section-units"
            title="Unit types"
            hint={fields.length > 0 ? `${fields.length} added` : "Optional: layouts and pricing"}
            defaultOpen={false}
            invalid={hasError("units")}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="hidden text-lg font-semibold text-ink-900 md:block">Unit types</h2>
                <p className="text-sm text-ink-500">Optional: list the available layouts and pricing.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() =>
                  append({ name: "", bedrooms: 0, bathrooms: 0, size: 0, sizeUnit: "sqft", price: 0, available: 0 })
                }
              >
                <Plus className="h-4 w-4" /> Add unit
              </Button>
            </div>

            {fields.length === 0 ? (
              <p className="mt-4 rounded-[1rem] border border-dashed border-border bg-ink-50/60 px-4 py-6 text-center text-sm text-ink-500">
                No unit types added yet.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {fields.map((unit, index) => (
                  <div key={unit.id} className="grid items-end gap-3 rounded-[1.25rem] border border-border p-4 sm:grid-cols-2 lg:grid-cols-7">
                    <div className="lg:col-span-2">
                      <label className="text-xs font-medium text-ink-700">Name</label>
                      <Input placeholder="3 Bed Premium" {...form.register(`units.${index}.name`)} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-ink-700">Beds</label>
                      <Input type="number" inputMode="numeric" {...form.register(`units.${index}.bedrooms`)} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-ink-700">Baths</label>
                      <Input type="number" inputMode="numeric" {...form.register(`units.${index}.bathrooms`)} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-ink-700">Size (sqft)</label>
                      <Input type="number" inputMode="numeric" {...form.register(`units.${index}.size`)} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-ink-700">Price (BDT)</label>
                      <Input type="number" inputMode="numeric" {...form.register(`units.${index}.price`)} />
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label className="text-xs font-medium text-ink-700">Available</label>
                        <Input type="number" inputMode="numeric" {...form.register(`units.${index}.available`)} />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label={`Remove unit ${index + 1}`}
                        className="size-9 shrink-0 rounded-full border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </FormSection>

          {/* Views & pricing — a premium view (golf, corner, lake…) lifts the price */}
          <FormSection
            id="section-views"
            title="Views and pricing"
            hint={viewFields.length > 0 ? `${viewFields.length} added` : "Optional: premium views"}
            defaultOpen={false}
            invalid={hasError("views")}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="hidden text-lg font-semibold text-ink-900 md:block">Views &amp; Pricing</h2>
                <p className="text-sm text-ink-500">
                  Highlight sellable views like golf, corner, or lake. Add the extra price each view carries — buyers see this on the apartment page.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => appendView({ name: "", pricePremium: undefined })}
              >
                <Plus className="h-4 w-4" /> Add view
              </Button>
            </div>

            <datalist id="view-suggestions">
              {PROJECT_VIEW_OPTIONS.map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>

            {viewFields.length === 0 ? (
              <p className="mt-4 rounded-[1rem] border border-dashed border-border bg-ink-50/60 px-4 py-6 text-center text-sm text-ink-500">
                No views added yet.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {viewFields.map((view, index) => (
                  <div
                    key={view.id}
                    className="grid items-end gap-3 rounded-[1.25rem] border border-border p-4 sm:grid-cols-[1fr_1fr_auto]"
                  >
                    <div>
                      <label className="text-xs font-medium text-ink-700">View</label>
                      <Input
                        list="view-suggestions"
                        placeholder="Golf View"
                        {...form.register(`views.${index}.name`)}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-ink-700">Extra price (BDT)</label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        placeholder="500000"
                        {...form.register(`views.${index}.pricePremium`)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label={`Remove view ${index + 1}`}
                      className="size-9 shrink-0 rounded-full border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => removeView(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </FormSection>

          {/* Nearby landmarks */}
          <FormSection
            id="section-landmarks"
            title="Nearby landmarks"
            hint={landmarkFields.length > 0 ? `${landmarkFields.length} added` : "Optional: group by drive time"}
            defaultOpen={false}
            invalid={hasError("nearbyLandmarks")}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="hidden text-lg font-semibold text-ink-900 md:block">Nearby Landmarks</h2>
                <p className="text-sm text-ink-500">
                  Group landmarks by drive time — e.g. “5–10 min Drive”.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => appendLandmark({ name: "", group: "" })}
              >
                <Plus className="h-4 w-4" /> Add landmark
              </Button>
            </div>

            <datalist id="landmark-groups">
              <option value="Within 5 min Drive" />
              <option value="5–10 min Drive" />
              <option value="10–20 min Drive" />
              <option value="20–30 min Drive" />
            </datalist>

            {landmarkFields.length === 0 ? (
              <p className="mt-4 rounded-[1rem] border border-dashed border-border bg-ink-50/60 px-4 py-6 text-center text-sm text-ink-500">
                No landmarks added yet.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {landmarkFields.map((landmark, index) => (
                  <div
                    key={landmark.id}
                    className="grid items-end gap-3 rounded-[1.25rem] border border-border p-4 sm:grid-cols-[1fr_1fr_auto]"
                  >
                    <div>
                      <label className="text-xs font-medium text-ink-700">Landmark</label>
                      <Input
                        placeholder="North South University"
                        {...form.register(`nearbyLandmarks.${index}.name`)}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-ink-700">Drive-time group</label>
                      <Input
                        list="landmark-groups"
                        placeholder="5–10 min Drive"
                        {...form.register(`nearbyLandmarks.${index}.group`)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label={`Remove landmark ${index + 1}`}
                      className="size-9 shrink-0 rounded-full border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => removeLandmark(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </FormSection>

          {/* Featured + submit */}
          <FormSection
            id="section-featured"
            title="Visibility"
            hint="Feature on the homepage"
            defaultOpen={false}
            invalid={hasError("isFeatured")}
          >
            <FormField
              control={form.control}
              name="isFeatured"
              render={({ field }) => (
                <FormItem>
                  <label className="flex min-h-11 items-center gap-3 rounded-[1rem] border border-border px-3 py-2">
                    <input
                      type="checkbox"
                      checked={field.value ?? false}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="size-6 shrink-0 accent-brand-600 lg:size-4"
                    />
                    <span className="text-sm text-ink-700">Feature this apartment on the homepage and listings</span>
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
                mode === "edit" ? "Update Apartment" : "Create Apartment"
              )}
            </Button>
            <Button type="button" variant="outline" className="rounded-full" onClick={() => router.push(ROUTES.ADMIN_PROJECTS)}>
              Cancel
            </Button>
          </div>

          <FormActionBar
            label="Apartment form actions"
            submitLabel={mode === "edit" ? "Update apartment" : "Create apartment"}
            submitting={form.formState.isSubmitting}
            onCancel={() => router.push(ROUTES.ADMIN_PROJECTS)}
          />
        </form>
      </Form>
    </div>
  )
}

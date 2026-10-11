"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useForm, useWatch, type FieldErrors } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { z } from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { TouchFileUploader } from "@/components/dashboard/touch-file-uploader"
import { FormSection } from "@/components/dashboard/form-section"
import { FormActionBar } from "@/components/dashboard/form-action-bar"
import { celebrate } from "@/lib/celebrate"
import { PropertyImagesUploader } from "@/components/forms/property-images-uploader"
import { PanoramaBuilder } from "@/components/forms/panorama-builder"
import { propertySchema, propertyCreateSchema } from "@/schemas/property.schema"
import { createProperty, updateProperty } from "@/services/properties.service"
import { PROPERTY_TYPE_OPTIONS, SIZE_UNIT_OPTIONS } from "@/data/property-types"
import { BD_DIVISIONS } from "@/data/locations.bd"
import { AMENITIES } from "@/data/amenities"
import { ROUTES } from "@/config/routes.config"
import type { Property } from "@/types/property.types"

type PropertyFormValues = z.input<typeof propertySchema>
type PropertySubmitValues = z.output<typeof propertySchema>

interface PropertyFormProps {
  mode: "create" | "edit"
  initialProperty?: Property
  contactDefaults?: {
    name: string
    phone: string
    whatsApp?: string
  }
}

function getDefaultValues(initialProperty?: Property, contactDefaults?: PropertyFormProps["contactDefaults"]): PropertyFormValues {
  return {
    title: initialProperty?.title ?? "",
    description: initialProperty?.description ?? "",
    type: initialProperty?.type ?? "apartment",
    purpose: initialProperty?.purpose ?? "sale",
    price: initialProperty?.price ?? 0,
    priceNegotiable: initialProperty?.priceNegotiable ?? false,
    division: initialProperty?.division ?? "",
    district: initialProperty?.district ?? "",
    area: initialProperty?.area ?? "",
    address: initialProperty?.address ?? "",
    mapPin: initialProperty?.mapPin ?? "",
    size: initialProperty?.size ?? 0,
    sizeUnit: (initialProperty?.sizeUnit ?? "sqft") as "sqft" | "katha" | "shotangsho" | "bigha",
    bedrooms: initialProperty?.bedrooms ?? 0,
    bathrooms: initialProperty?.bathrooms ?? 0,
    balconies: initialProperty?.balconies ?? 0,
    floorNumber: initialProperty?.floorNumber ?? 0,
    totalFloors: initialProperty?.totalFloors ?? 1,
    facilities: initialProperty?.facilities ?? [],
    images: initialProperty?.images ?? [],
    videos: initialProperty?.videos ?? [],
    videoUrl: initialProperty?.videoUrl ?? "",
    panorama: initialProperty?.panoramaUrl ? [initialProperty.panoramaUrl] : [],
    contactName: initialProperty?.sellerName ?? contactDefaults?.name ?? "",
    contactPhone: initialProperty?.sellerPhone ?? contactDefaults?.phone ?? "",
    whatsApp: initialProperty?.sellerWhatsApp ?? contactDefaults?.whatsApp ?? "",
  }
}

export function PropertyForm({ mode, initialProperty, contactDefaults }: PropertyFormProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const errorRef = useRef<HTMLDivElement>(null)

  const form = useForm<PropertyFormValues, undefined, PropertySubmitValues>({
    // Create requires at least 5 photos; edit stays lenient so older listings
    // with fewer photos remain editable.
    resolver: zodResolver(mode === "create" ? propertyCreateSchema : propertySchema),
    defaultValues: getDefaultValues(initialProperty, contactDefaults),
  })

  const selectedDivision = useWatch({ control: form.control, name: "division" }) ?? ""
  const imageValues = useWatch({ control: form.control, name: "images" }) ?? []
  const videoValues = useWatch({ control: form.control, name: "videos" }) ?? []
  const panoramaValues = useWatch({ control: form.control, name: "panorama" }) ?? []
  const selectedFacilities = useWatch({ control: form.control, name: "facilities" }) ?? []

  // Phones fold the form into sections; one with a validation error opens itself.
  const errs = form.formState.errors
  const hasError = (...names: (keyof PropertyFormValues)[]) => names.some((name) => Boolean(errs[name]))

  // A save error is shown at the top of the form; bring it into view from the sticky Save bar.
  useEffect(() => {
    if (submitError) errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [submitError])

  function onInvalid(errors: FieldErrors<PropertyFormValues>) {
    const first = Object.keys(errors)[0] as keyof PropertyFormValues | undefined
    if (!first) return
    // Sections open on the next render; focus the first bad field once they have.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        try {
          form.setFocus(first)
        } catch {
          // Not a focusable field (e.g. the photo grid): its error message is already visible.
        }
      }),
    )
  }

  const districts = useMemo(
    () => BD_DIVISIONS.find((division) => division.name === selectedDivision)?.districts.map((district) => district.name) ?? [],
    [selectedDivision],
  )

  async function onSubmit(values: PropertySubmitValues) {
    setSubmitError(null)

    if (!session?.accessToken) {
      setSubmitError("Please sign in again to save this listing.")
      return
    }

    try {
      if (mode === "edit" && initialProperty) {
        await updateProperty(initialProperty.id, values, session.accessToken)
      } else {
        await createProperty(values, session.accessToken)
        celebrate()
      }

      router.push(ROUTES.SELLER_PROPERTIES)
      router.refresh()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to save property")
    }
  }

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* The page header above already names the screen on phones. */}
      <div className="surface-panel hidden p-5 sm:block">
        <p className="text-xs uppercase tracking-[0.18em] text-brand-700">
          {mode === "edit" ? "Edit listing" : "New listing"}
        </p>
        <h2 className="mt-2 text-h3">
          {mode === "edit" ? "Update property details" : "Create property listing"}
        </h2>
        <p className="mt-2 text-sm text-ink-500">
          Submit a complete listing with market-ready details, media, and seller contact information.
        </p>
      </div>

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
          <FormSection
            id="section-basics"
            title="Basics"
            hint="Title, description, price"
            invalid={hasError("title", "description", "type", "purpose", "price", "priceNegotiable")}
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            <div className="md:col-span-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Listing Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Elegant 3-bedroom apartment in Bashundhara R/A…" {...field} />
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
                      <Textarea rows={6} placeholder="Describe layout, condition, nearby landmarks, access, and standout amenities…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Property Type</FormLabel>
                  <FormControl>
                    <select {...field} className="w-full rounded-[1rem] border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-400">
                      {PROPERTY_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="purpose"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purpose</FormLabel>
                  <div className="flex gap-2">
                    {(["sale", "rent"] as const).map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => field.onChange(value)}
                        className={`min-h-11 flex-1 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                          field.value === value
                            ? "border-brand-700 bg-brand-700 text-white"
                            : "border-border hover:border-brand-300"
                        }`}
                      >
                        {value === "sale" ? "For Sale" : "For Rent"}
                      </button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price (BDT)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      placeholder="13500000"
                      {...field}
                      value={typeof field.value === "number" || typeof field.value === "string" ? field.value : ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priceNegotiable"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Negotiable</FormLabel>
                  <label className="flex min-h-11 items-center gap-3 rounded-[1rem] border border-border px-3 py-2">
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={(event) => field.onChange(event.target.checked)}
                      className="size-6 accent-brand-600 lg:size-4"
                    />
                    <span className="text-sm text-ink-700">Price can be negotiated</span>
                  </label>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormSection>

          <FormSection
            id="section-location"
            title="Location"
            hint="Division, district, area, address"
            defaultOpen={mode === "create"}
            invalid={hasError("division", "district", "area", "address", "mapPin")}
            className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
          >
            <FormField
              control={form.control}
              name="division"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Division</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      onChange={(event) => {
                        field.onChange(event.target.value)
                        form.setValue("district", "")
                      }}
                      className="w-full rounded-[1rem] border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-400"
                    >
                      <option value="">Select Division</option>
                      {BD_DIVISIONS.map((division) => (
                        <option key={division.name} value={division.name}>{division.name}</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="district"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>District</FormLabel>
                  <FormControl>
                    <select {...field} className="w-full rounded-[1rem] border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-400">
                      <option value="">Select District</option>
                      {districts.map((district) => (
                        <option key={district} value={district}>{district}</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="area"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Area</FormLabel>
                  <FormControl>
                    <Input placeholder="Bashundhara R/A" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="md:col-span-2 lg:col-span-3">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Block E, Road 11, Bashundhara R/A, Dhaka 1229" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="md:col-span-2 lg:col-span-3">
              <FormField
                control={form.control}
                name="mapPin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Map Pin / Maps URL</FormLabel>
                    <FormControl>
                      <Input placeholder="Google Maps link or coordinates" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </FormSection>

          <FormSection
            id="section-specs"
            title="Size and rooms"
            hint="Size, bedrooms, bathrooms, floors"
            defaultOpen={mode === "create"}
            invalid={hasError("size", "sizeUnit", "bedrooms", "bathrooms", "balconies", "floorNumber", "totalFloors")}
            className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4"
          >
            <FormField
              control={form.control}
              name="size"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Size</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      placeholder="1450"
                      {...field}
                      value={typeof field.value === "number" || typeof field.value === "string" ? field.value : ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sizeUnit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Size Unit</FormLabel>
                  <FormControl>
                    <select {...field} className="w-full rounded-[1rem] border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-400">
                      {SIZE_UNIT_OPTIONS.map((unit) => (
                        <option key={unit.value} value={unit.value}>{unit.label}</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(["bedrooms", "bathrooms", "balconies", "floorNumber", "totalFloors"] as const).map((fieldName) => (
              <FormField
                key={fieldName}
                control={form.control}
                name={fieldName}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{fieldName === "floorNumber" ? "Floor Number" : fieldName === "totalFloors" ? "Total Floors" : fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="numeric"
                        placeholder="0"
                        {...field}
                        value={typeof field.value === "number" || typeof field.value === "string" ? field.value : ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </FormSection>

          <FormSection
            id="section-media"
            title="Facilities and media"
            hint="Facilities, photos, videos, 360 tour"
            defaultOpen={mode === "create"}
            invalid={hasError("facilities", "images", "videos", "videoUrl", "panorama")}
          >
            <h2 className="hidden text-lg font-semibold text-ink-900 md:block">Facilities & Media</h2>
            <div className="mt-2 grid gap-2 md:mt-4 md:grid-cols-2 xl:grid-cols-3">
              {AMENITIES.map((category) => (
                <div key={category.category} className="rounded-[1.25rem] border border-border bg-ink-50 p-3 sm:p-4">
                  <p className="text-sm font-semibold text-ink-900">{category.category}</p>
                  <div className="mt-2 grid grid-cols-2 gap-x-3 sm:mt-3 sm:block sm:space-y-2">
                    {category.items.map((amenity) => (
                      <label key={amenity} className="flex min-h-10 items-center gap-2 text-sm text-ink-700 lg:min-h-0">
                        <input
                          type="checkbox"
                          checked={selectedFacilities.includes(amenity)}
                          onChange={(event) => {
                            const current = form.getValues("facilities") ?? []
                            form.setValue(
                              "facilities",
                              event.target.checked
                                ? [...current, amenity]
                                : current.filter((item) => item !== amenity),
                              { shouldDirty: true, shouldValidate: true },
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

            <div className="mt-6 space-y-2">
              <PropertyImagesUploader
                value={imageValues}
                onChange={(urls) =>
                  form.setValue("images", urls, { shouldValidate: true, shouldDirty: true })
                }
                minImages={5}
                maxImages={12}
              />
              {form.formState.errors.images?.message && (
                <p className="text-sm text-red-600">{form.formState.errors.images.message}</p>
              )}
              <p className="text-xs text-ink-600">
                <span className="sm:hidden">
                  The first photo is the cover buyers see first. Tap a photo to set the cover, reorder or remove it.
                </span>
                <span className="hidden sm:inline">
                  The first photo is the cover buyers see first. Drag-reorder isn&apos;t needed — use the
                  arrows or “Set cover” on any photo.
                </span>
              </p>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <TouchFileUploader
                  kind="property-video"
                  multiple
                  maxFiles={3}
                  label="Videos (optional)"
                  hint="Up to 3 clips · max 60 MB each (mp4, webm, mov)"
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
                      <Input placeholder="https://youtube.com/watch?v=…" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="mt-6 space-y-2">
              <TouchFileUploader
                kind="property-image"
                label="360° Panorama (optional)"
                hint="One equirectangular (2:1) photo powers the interactive virtual tour · max 10 MB"
                value={panoramaValues}
                onChange={(urls) =>
                  form.setValue("panorama", urls.slice(0, 1), {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
              />
              {form.formState.errors.panorama?.message && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.panorama.message}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-500">
                <span>
                  Upload a 360° equirectangular shot (a 2:1 image, e.g.
                  4096×2048) — or
                </span>
                <PanoramaBuilder
                  galleryUrls={imageValues}
                  onBuilt={(url) =>
                    form.setValue("panorama", [url], {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                />
                <span>from your listing photos. Leave empty for the sample tour.</span>
              </div>
            </div>

          </FormSection>

          <FormSection
            id="section-contact"
            title="Contact"
            hint="Who buyers will reach"
            defaultOpen={mode === "create"}
            invalid={hasError("contactName", "contactPhone", "whatsApp")}
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            <FormField
              control={form.control}
              name="contactName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Tanvir Ahmed" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Phone</FormLabel>
                  <FormControl>
                    <Input type="tel" inputMode="tel" placeholder="01711234567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="whatsApp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp</FormLabel>
                  <FormControl>
                    <Input type="tel" inputMode="tel" placeholder="01711234567" {...field} value={field.value ?? ""} />
                  </FormControl>
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
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                mode === "edit" ? "Update Property" : "Create Property"
              )}
            </Button>
            <Button type="button" variant="outline" className="rounded-full" onClick={() => router.push(ROUTES.SELLER_PROPERTIES)}>
              Cancel
            </Button>
          </div>

          <FormActionBar
            label="Property form actions"
            submitLabel={mode === "edit" ? "Update property" : "Create property"}
            submitting={form.formState.isSubmitting}
            onCancel={() => router.push(ROUTES.SELLER_PROPERTIES)}
          />
        </form>
      </Form>
    </div>
  )
}

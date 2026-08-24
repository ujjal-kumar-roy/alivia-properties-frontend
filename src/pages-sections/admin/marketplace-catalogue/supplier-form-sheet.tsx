"use client"

import { useEffect, useState } from "react"
import { Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FileUploader } from "@/components/common/file-uploader"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { marketplaceService } from "@/services/marketplace.service"
import type { Supplier } from "@/types/marketplace.types"

type ProviderKind = "SUPPLIER" | "SERVICE"

type SupplierForm = {
  id?: string
  categorySlug: string
  kind: ProviderKind
  name: string
  logo: string
  coverImage: string
  gallery: string
  videoUrl: string
  location: string
  serviceAreas: string
  phone: string
  email: string
  tagline: string
  brands: string
  priceRange: string
  responseTimeHours: string
  deliveryDays: string
  itemsSold: string
  inStock: "in" | "out"
}

function inferProviderKind(categorySlug: string): ProviderKind {
  const slug = categorySlug.toLowerCase()
  return ["electrician", "ac-technician", "plumber", "repair", "maintenance", "service"].some((token) => slug.includes(token))
    ? "SERVICE"
    : "SUPPLIER"
}

function supplierDefaults(categorySlug: string): SupplierForm {
  return {
    categorySlug,
    kind: inferProviderKind(categorySlug),
    name: "",
    logo: "",
    coverImage: "",
    gallery: "",
    videoUrl: "",
    location: "Dhaka",
    serviceAreas: "Dhaka\nGazipur\nNarayanganj",
    phone: "",
    email: "",
    tagline: "",
    brands: "",
    priceRange: "Quote on request",
    responseTimeHours: "2",
    deliveryDays: "1",
    itemsSold: "",
    inStock: "in",
  }
}

function fromSupplier(supplier: Supplier): SupplierForm {
  return {
    id: supplier.id,
    categorySlug: supplier.categories[0] ?? "",
    kind: supplier.kind.toUpperCase() as ProviderKind,
    name: supplier.name,
    logo: supplier.logo ?? "",
    coverImage: supplier.coverImage ?? "",
    gallery: (supplier.gallery ?? []).join("\n"),
    videoUrl: supplier.videoUrl ?? "",
    location: supplier.location,
    serviceAreas: supplier.serviceAreas.join("\n"),
    phone: supplier.phone,
    email: supplier.email ?? "",
    tagline: supplier.tagline ?? "",
    brands: (supplier.brands ?? []).join("\n"),
    priceRange: supplier.priceRange ?? "",
    responseTimeHours: supplier.responseTimeHours != null ? String(supplier.responseTimeHours) : "",
    deliveryDays: supplier.deliveryDays != null ? String(supplier.deliveryDays) : "",
    itemsSold: supplier.itemsSold != null ? String(supplier.itemsSold) : "",
    inStock: supplier.inStock === false ? "out" : "in",
  }
}

function splitLines(value: string) {
  return value.split(/\r?\n|,/).map((part) => part.trim()).filter(Boolean)
}

function toOptionalNumber(value: string) {
  const trimmed = value.trim()
  return trimmed ? Number(trimmed) : undefined
}

export function SupplierFormSheet({
  token,
  open,
  onOpenChange,
  supplier,
  categorySlug,
  onSaved,
}: {
  token: string
  open: boolean
  onOpenChange: (open: boolean) => void
  supplier: Supplier | null
  categorySlug: string
  onSaved: () => Promise<void>
}) {
  const [form, setForm] = useState<SupplierForm>(() => (supplier ? fromSupplier(supplier) : supplierDefaults(categorySlug)))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setForm(supplier ? fromSupplier(supplier) : supplierDefaults(categorySlug))
  }, [open, supplier, categorySlug])

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const gallery = splitLines(form.gallery)
      const serviceAreas = splitLines(form.serviceAreas)
      const brands = splitLines(form.brands)
      const payload = {
        name: form.name,
        logo: form.logo || undefined,
        coverImage: form.coverImage || gallery[0] || undefined,
        gallery: gallery.length > 0 ? gallery : undefined,
        videoUrl: form.videoUrl || undefined,
        location: form.location,
        serviceAreas: serviceAreas.length > 0 ? serviceAreas : undefined,
        phone: form.phone,
        email: form.email || undefined,
        tagline: form.tagline || undefined,
        brands: brands.length > 0 ? brands : [form.name],
        priceRange: form.priceRange || undefined,
        responseTimeHours: toOptionalNumber(form.responseTimeHours),
        deliveryDays: toOptionalNumber(form.deliveryDays),
        itemsSold: toOptionalNumber(form.itemsSold),
        inStock: form.inStock === "in",
        categories: [form.categorySlug],
        kind: form.kind,
        isVerified: true,
      }
      if (form.id) await marketplaceService.adminUpdateSupplier(form.id, payload, token)
      else await marketplaceService.adminCreateSupplier(payload, token)
      await onSaved()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save listing.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{form.id ? "Edit listing" : "Add listing"}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-4">
          {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          <label className="grid gap-1.5 text-xs font-semibold text-ink-700">
            Listing type
            <select value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as ProviderKind }))} className="h-10 rounded-lg border border-border bg-white px-3 text-sm font-normal">
              <option value="SUPPLIER">Supplier</option>
              <option value="SERVICE">Service provider</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-ink-700">
            Name
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-ink-700">
            Location
            <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-ink-700">
            Phone
            <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-ink-700">
            Email
            <Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </label>
          <FileUploader kind="category-image" label="Logo" value={form.logo ? [form.logo] : []} onChange={(urls) => setForm((f) => ({ ...f, logo: urls[0] ?? "" }))} />
          <FileUploader kind="category-image" label="Cover image" value={form.coverImage ? [form.coverImage] : []} onChange={(urls) => setForm((f) => ({ ...f, coverImage: urls[0] ?? "" }))} />
          <label className="grid gap-1.5 text-xs font-semibold text-ink-700">
            Tagline
            <Textarea value={form.tagline} onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))} />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-ink-700">
            Service areas (one per line)
            <Textarea value={form.serviceAreas} onChange={(e) => setForm((f) => ({ ...f, serviceAreas: e.target.value }))} />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-ink-700">
            Brand tags (one per line)
            <Textarea value={form.brands} onChange={(e) => setForm((f) => ({ ...f, brands: e.target.value }))} />
          </label>
          <Button type="button" disabled={saving || !form.name || !form.phone} onClick={save}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save listing
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

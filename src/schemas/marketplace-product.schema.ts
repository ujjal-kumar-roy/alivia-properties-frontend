import { z } from "zod"
import type { MarketplaceProduct } from "@/types/marketplace.types"

const variantRowSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Variant name is required"),
  unit: z.string().optional().default(""),
  sku: z.string().optional().default(""),
  price: z.string().optional().default(""),
  isActive: z.boolean().optional().default(true),
})

const specRowSchema = z.object({
  key: z.string().optional(),
  label: z.string().min(1, "Spec label is required"),
  value: z.string().min(1, "Spec value is required"),
  unit: z.string().optional().default(""),
})

const priceTierRowSchema = z.object({
  minQty: z.string().min(1, "Minimum quantity is required"),
  maxQty: z.string().optional().default(""),
  price: z.string().min(1, "Price is required"),
  note: z.string().optional().default(""),
})

const documentRowSchema = z.object({
  label: z.string().min(1, "Document label is required"),
  url: z.string().min(1, "Upload a file first"),
})

export const productFormSchema = z.object({
  id: z.string().optional(),
  supplierId: z.string().min(1, "Select a supplier"),
  categorySlug: z.string().min(1, "Select a category"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  image: z.string().min(1, "A thumbnail image is required"),
  gallery: z.array(z.string()).optional().default([]),
  videoUrl: z.string().optional().default(""),
  documents: z.array(documentRowSchema).optional().default([]),
  price: z.string().optional().default(""),
  unit: z.string().min(1, "Unit is required"),
  inStock: z.enum(["in", "out"]).default("in"),
  moq: z.string().optional().default(""),
  leadTimeDays: z.string().optional().default(""),
  brand: z.string().optional().default(""),
  badge: z.string().optional().default(""),
  description: z.string().optional().default(""),
  highlights: z.array(z.string()).optional().default([]),
  specs: z.array(specRowSchema).optional().default([]),
  variants: z.array(variantRowSchema).optional().default([]),
  priceTiers: z.array(priceTierRowSchema).optional().default([]),
  sku: z.string().optional().default(""),
  warranty: z.string().optional().default(""),
  origin: z.string().optional().default(""),
  packaging: z.string().optional().default(""),
  certifications: z.array(z.string()).optional().default([]),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  order: z.string().optional().default(""),
})

export type ProductFormInput = z.input<typeof productFormSchema>
export type ProductFormValues = z.output<typeof productFormSchema>

export function emptyProductForm(supplierId = "", categorySlug = "", unit = "unit"): ProductFormInput {
  return {
    supplierId,
    categorySlug,
    name: "",
    image: "",
    gallery: [],
    videoUrl: "",
    documents: [],
    price: "",
    unit,
    inStock: "in",
    moq: "",
    leadTimeDays: "1",
    brand: "",
    badge: "",
    description: "",
    highlights: [],
    specs: [],
    variants: [],
    priceTiers: [],
    sku: "",
    warranty: "",
    origin: "",
    packaging: "",
    certifications: [],
    isActive: true,
    isFeatured: false,
    order: "",
  }
}

/** Maps a loaded MarketplaceProduct onto the form's input shape, for edit routes. */
export function productToFormValues(product: MarketplaceProduct): ProductFormInput {
  return {
    id: product.id,
    supplierId: product.supplierId,
    categorySlug: product.categorySlug,
    name: product.name,
    image: product.image ?? "",
    gallery: product.gallery ?? [],
    videoUrl: product.videoUrl ?? "",
    documents: (product.documents ?? []).map((doc) => ({ label: doc.label, url: doc.url })),
    price: product.price != null && product.price > 0 ? String(product.price) : "",
    unit: product.unit,
    inStock: product.inStock === false ? "out" : "in",
    moq: product.moq != null ? String(product.moq) : "",
    leadTimeDays: product.leadTimeDays != null ? String(product.leadTimeDays) : "",
    brand: product.brand ?? "",
    badge: product.badge ?? "",
    description: product.description ?? "",
    highlights: product.highlights ?? [],
    specs: (product.specs ?? []).map((spec) => ({
      key: spec.key,
      label: spec.label,
      value: spec.value,
      unit: spec.unit ?? "",
    })),
    variants: (product.variants ?? []).map((variant) => ({
      id: variant.id,
      name: variant.name,
      unit: variant.unit ?? "",
      sku: variant.sku ?? "",
      price: variant.price != null ? String(variant.price) : "",
      isActive: variant.isActive !== false,
    })),
    priceTiers: (product.priceTiers ?? []).map((tier) => ({
      minQty: String(tier.minQty),
      maxQty: tier.maxQty != null ? String(tier.maxQty) : "",
      price: String(tier.price),
      note: tier.note ?? "",
    })),
    sku: product.sku ?? "",
    warranty: product.warranty ?? "",
    origin: product.origin ?? "",
    packaging: product.packaging ?? "",
    certifications: product.certifications ?? [],
    isActive: product.isActive,
    isFeatured: product.isFeatured,
    order: product.order != null ? String(product.order) : "",
  }
}

function toOptionalNumber(value: string) {
  const trimmed = value.trim()
  return trimmed ? Number(trimmed) : undefined
}

/** Maps validated form output onto the API's CreateProductInput/UpdateProductInput shape. */
export function productFormToPayload(values: ProductFormValues) {
  return {
    supplierId: values.supplierId,
    categorySlug: values.categorySlug,
    name: values.name,
    image: values.image,
    gallery: values.gallery.length > 0 ? values.gallery : undefined,
    videoUrl: values.videoUrl || undefined,
    documents: values.documents.filter((doc) => doc.label.trim() && doc.url.trim()),
    price: toOptionalNumber(values.price),
    unit: values.unit,
    inStock: values.inStock === "in",
    moq: toOptionalNumber(values.moq),
    leadTimeDays: toOptionalNumber(values.leadTimeDays),
    brand: values.brand || undefined,
    badge: values.badge || undefined,
    description: values.description || `${values.name} quote-ready product.`,
    highlights: values.highlights.filter((h) => h.trim()),
    specs: values.specs
      .filter((spec) => spec.label.trim() && spec.value.trim())
      .map((spec) => ({
        key: spec.key?.trim() || undefined,
        label: spec.label.trim(),
        value: spec.value.trim(),
        unit: spec.unit.trim() || undefined,
      })),
    variants: values.variants
      .filter((variant) => variant.name.trim())
      .map((variant) => ({
        id: variant.id,
        name: variant.name.trim(),
        unit: variant.unit.trim() || values.unit,
        sku: variant.sku.trim() || undefined,
        price: variant.price.trim() ? Number(variant.price) : undefined,
        isActive: variant.isActive,
      })),
    priceTiers: values.priceTiers
      .filter((tier) => tier.minQty.trim() && tier.price.trim())
      .map((tier) => ({
        minQty: Number(tier.minQty),
        maxQty: tier.maxQty.trim() ? Number(tier.maxQty) : undefined,
        price: Number(tier.price),
        note: tier.note.trim() || undefined,
      })),
    sku: values.sku || undefined,
    warranty: values.warranty || undefined,
    origin: values.origin || undefined,
    packaging: values.packaging || undefined,
    certifications: values.certifications.filter((c) => c.trim()),
    isActive: values.isActive,
    isFeatured: values.isFeatured,
    order: toOptionalNumber(values.order) ?? 0,
  }
}

"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { ProductEditor } from "@/components/marketplace/product-editor/product-editor"
import {
  emptyProductForm,
  productFormToPayload,
  productToFormValues,
  type ProductFormValues,
} from "@/schemas/marketplace-product.schema"
import { marketplaceService, type MarketplaceCategory } from "@/services/marketplace.service"
import type { MarketplaceProduct, Supplier } from "@/types/marketplace.types"

export function AdminProductEditorHost({
  token,
  mode,
  categories,
  suppliers,
  product,
  cloneProduct,
  defaultSupplierId,
  defaultCategorySlug,
}: {
  token: string
  mode: "create" | "edit"
  categories: MarketplaceCategory[]
  suppliers: Supplier[]
  product?: MarketplaceProduct
  cloneProduct?: MarketplaceProduct
  defaultSupplierId?: string
  defaultCategorySlug?: string
}) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const supplierOptions = suppliers.map((s) => ({ value: s.id, label: s.name }))
  const categoryOptions = categories.map((c) => ({ value: c.slug, label: c.name }))

  const source = product ?? cloneProduct
  const defaultValues = source
    ? { ...productToFormValues(source), id: mode === "edit" ? source.id : undefined }
    : { ...emptyProductForm(defaultSupplierId ?? "", defaultCategorySlug ?? "") }

  async function handleSubmit(values: ProductFormValues) {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const payload = productFormToPayload(values)
      if (mode === "edit" && product) {
        await marketplaceService.adminUpdateProduct(product.id, payload, token)
        router.push("/admin/marketplace/suppliers")
        router.refresh()
      } else {
        await marketplaceService.adminCreateProduct(payload, token)
        router.push(`/admin/marketplace/products/new?supplierId=${values.supplierId}&categorySlug=${values.categorySlug}`)
        router.refresh()
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not save product.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ProductEditor
      mode={mode}
      supplierOptions={supplierOptions}
      categoryOptions={categoryOptions}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      submitting={submitting}
      submitError={submitError}
    />
  )
}

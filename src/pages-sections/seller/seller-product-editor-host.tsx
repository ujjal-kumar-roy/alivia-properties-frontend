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
import { ROUTES } from "@/config/routes.config"

export function SellerProductEditorHost({
  token,
  mode,
  categories,
  suppliers,
  product,
  defaultSupplierId,
}: {
  token: string
  mode: "create" | "edit"
  categories: MarketplaceCategory[]
  suppliers: Supplier[]
  product?: MarketplaceProduct
  defaultSupplierId?: string
}) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const supplierOptions = suppliers.map((s) => ({ value: s.id, label: s.name }))
  const categoryOptions = categories.map((c) => ({ value: c.slug, label: c.name }))
  const defaultValues = product
    ? productToFormValues(product)
    : emptyProductForm(defaultSupplierId ?? suppliers[0]?.id ?? "", categories[0]?.slug ?? "")

  async function handleSubmit(values: ProductFormValues) {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const payload = productFormToPayload(values)
      if (mode === "edit" && product) {
        await marketplaceService.sellerUpdateProduct(product.id, payload, token)
      } else {
        await marketplaceService.sellerCreateProduct(payload, token)
      }
      router.push(ROUTES.SELLER_MARKETPLACE_CATALOGUE)
      router.refresh()
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

"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { ProductEditor } from "@/components/marketplace/product-editor/product-editor"
import {
  emptyProductForm,
  productFormToPayload,
  productToFormValues,
  type ProductFormInput,
  type ProductFormValues,
} from "@/schemas/marketplace-product.schema"
import { marketplaceService, type MarketplaceCategory } from "@/services/marketplace.service"
import type { MarketplaceProduct, Supplier } from "@/types/marketplace.types"

function initialDefaultValues({
  mode,
  product,
  cloneProduct,
  defaultSupplierId,
  defaultCategorySlug,
}: {
  mode: "create" | "edit"
  product?: MarketplaceProduct
  cloneProduct?: MarketplaceProduct
  defaultSupplierId?: string
  defaultCategorySlug?: string
}): Partial<ProductFormInput> {
  const source = product ?? cloneProduct
  return source
    ? { ...productToFormValues(source), id: mode === "edit" ? source.id : undefined }
    : { ...emptyProductForm(defaultSupplierId ?? "", defaultCategorySlug ?? "") }
}

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

  // Bundles the remount `key` together with the `defaultValues` it was built
  // for. React Hook Form's useForm() only reads `defaultValues` once at
  // mount, and after "Save & add another" we `router.push()` back to this
  // same route — App Router keeps this Client Component mounted in place
  // (same type/position) rather than remounting it, so a stale RHF instance
  // would otherwise keep showing the just-submitted values.
  //
  // Bumping the key alone isn't enough either: the key bump (a synchronous
  // local setState) commits before the async server navigation delivers this
  // component fresh props, so re-deriving `defaultValues` from `product` /
  // `cloneProduct` props at that moment would still read pre-navigation
  // values — e.g. after creating from a "Duplicate" clone, the remounted
  // form would show that same cloned product's fields again instead of a
  // blank one. Computing the post-create defaultValues locally from the
  // just-submitted `values` sidesteps that race entirely.
  const [editor, setEditor] = useState(() => ({
    key: 0,
    defaultValues: initialDefaultValues({ mode, product, cloneProduct, defaultSupplierId, defaultCategorySlug }),
  }))

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
        setEditor((prev) => ({
          key: prev.key + 1,
          defaultValues: emptyProductForm(values.supplierId, values.categorySlug),
        }))
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not save product.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ProductEditor
      key={editor.key}
      mode={mode}
      supplierOptions={supplierOptions}
      categoryOptions={categoryOptions}
      defaultValues={editor.defaultValues}
      onSubmit={handleSubmit}
      submitting={submitting}
      submitError={submitError}
    />
  )
}

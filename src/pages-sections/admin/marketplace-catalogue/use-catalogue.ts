"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { marketplaceService } from "@/services/marketplace.service"
import type { Supplier } from "@/types/marketplace.types"

export function useCatalogue(token: string, initialSuppliers: Supplier[]) {
  const router = useRouter()
  const [suppliers, setSuppliers] = useState(initialSuppliers)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    if (!token) return
    const res = await marketplaceService.adminListSuppliers({ limit: 100 }, token)
    setSuppliers(res.data)
    router.refresh()
  }

  async function deleteSupplier(id: string) {
    setError(null)
    setMessage(null)
    try {
      await marketplaceService.adminDeleteSupplier(id, token)
      await refresh()
      setMessage("Listing deleted.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete listing.")
    }
  }

  async function deleteProduct(id: string) {
    setError(null)
    setMessage(null)
    try {
      await marketplaceService.adminDeleteProduct(id, token)
      await refresh()
      setMessage("Product deleted.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete product.")
    }
  }

  /** Optimistic single-field PATCH for the inline quick-edit row — no full refetch. */
  async function quickEditProduct(id: string, patch: { price?: number; inStock?: boolean; isActive?: boolean }) {
    setError(null)
    setSuppliers((prev) =>
      prev.map((supplier) => ({
        ...supplier,
        products: (supplier.products ?? []).map((product) =>
          product.id === id ? { ...product, ...patch } : product,
        ),
      })),
    )
    try {
      await marketplaceService.adminUpdateProduct(id, patch, token)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update product.")
      await refresh()
    }
  }

  return { suppliers, message, error, setMessage, setError, refresh, deleteSupplier, deleteProduct, quickEditProduct }
}

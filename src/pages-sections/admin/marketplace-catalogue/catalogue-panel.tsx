"use client"

import { useDeferredValue, useState } from "react"
import { CheckCircle2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { MarketplaceCategory } from "@/services/marketplace.service"
import type { Supplier } from "@/types/marketplace.types"
import { CatalogueToolbar } from "./catalogue-toolbar"
import { SupplierCard } from "./supplier-card"
import { SupplierFormSheet } from "./supplier-form-sheet"
import { useCatalogue } from "./use-catalogue"

export function AdminMarketplaceCataloguePanel({
  token,
  categories,
  initialSuppliers,
}: {
  token: string
  categories: MarketplaceCategory[]
  initialSuppliers: Supplier[]
}) {
  const { suppliers, message, error, refresh, deleteSupplier, deleteProduct, quickEditProduct } = useCatalogue(token, initialSuppliers)
  const [categorySlug, setCategorySlug] = useState(categories[0]?.slug ?? "")
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)

  const inCategory = (supplier: Supplier) =>
    supplier.categories.includes(categorySlug) ||
    (supplier.products ?? []).some((p) => p.categorySlug === categorySlug)

  const matchesSearch = (supplier: Supplier) => {
    if (!deferredSearch.trim()) return true
    const needle = deferredSearch.toLowerCase()
    return (
      supplier.name.toLowerCase().includes(needle) ||
      (supplier.products ?? []).some((p) => p.name.toLowerCase().includes(needle))
    )
  }

  const visibleSuppliers = suppliers.filter((s) => inCategory(s) && matchesSearch(s))
  const countFor = (slug: string) => suppliers.filter((s) => s.categories.includes(slug)).length

  return (
    <div className="space-y-5">
      <CatalogueToolbar
        categories={categories}
        categorySlug={categorySlug}
        onCategoryChange={setCategorySlug}
        search={search}
        onSearchChange={setSearch}
        onRefresh={refresh}
        countFor={countFor}
      />

      {message ? (
        <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 className="size-4" /> {message}
        </p>
      ) : null}
      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={() => { setEditingSupplier(null); setSheetOpen(true) }}>
          <Plus className="size-3.5" /> Add supplier
        </Button>
      </div>

      <section className="surface-card overflow-hidden">
        <div className="divide-y divide-border/70">
          {visibleSuppliers.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-ink-500">No suppliers match — add one above.</p>
          ) : (
            visibleSuppliers.map((supplier) => (
              <SupplierCard
                key={supplier.id}
                supplier={supplier}
                onEdit={() => { setEditingSupplier(supplier); setSheetOpen(true) }}
                onDeleteSupplier={deleteSupplier}
                onQuickEditProduct={quickEditProduct}
                onDeleteProduct={deleteProduct}
              />
            ))
          )}
        </div>
      </section>

      <SupplierFormSheet
        token={token}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        supplier={editingSupplier}
        categorySlug={categorySlug}
        onSaved={refresh}
      />
    </div>
  )
}

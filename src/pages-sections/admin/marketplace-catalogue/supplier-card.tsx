"use client"

import Link from "next/link"
import { useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { providerLabel } from "@/utils/marketplace-kind"
import type { Supplier } from "@/types/marketplace.types"
import { SupplierProductTable } from "./supplier-product-table"

export function SupplierCard({
  supplier,
  onEdit,
  onDeleteSupplier,
  onQuickEditProduct,
  onDeleteProduct,
}: {
  supplier: Supplier
  onEdit: () => void
  onDeleteSupplier: (id: string) => void
  onQuickEditProduct: (id: string, patch: { price?: number; inStock?: boolean; isActive?: boolean }) => void
  onDeleteProduct: (id: string) => void
}) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const productCount = (supplier.products ?? []).length

  return (
    <div className="p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-ink-900">{supplier.name}</p>
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-700">
              {providerLabel(supplier.kind)}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-ink-600">{supplier.location}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/marketplace/products/new?supplierId=${supplier.id}&categorySlug=${supplier.categories[0] ?? ""}`}>
            <Button type="button" size="sm">
              <Plus className="size-3.5" /> Add product
            </Button>
          </Link>
          <Button type="button" size="sm" variant="outline" onClick={onEdit}>
            <Pencil className="size-3.5" /> Edit
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setConfirmOpen(true)}>
            <Trash2 className="size-3.5" /> Delete
          </Button>
        </div>
      </div>
      <div className="mt-4">
        <SupplierProductTable
          products={supplier.products ?? []}
          supplierId={supplier.id}
          onQuickEdit={onQuickEditProduct}
          onDelete={onDeleteProduct}
        />
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this supplier?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-ink-600">
            This also permanently deletes all {productCount} of its products. This cannot be undone.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                onDeleteSupplier(supplier.id)
                setConfirmOpen(false)
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

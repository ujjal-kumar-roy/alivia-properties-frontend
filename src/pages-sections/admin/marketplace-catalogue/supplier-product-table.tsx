"use client"

import Link from "next/link"
import { useState } from "react"
import { Copy, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { MarketplaceProduct } from "@/types/marketplace.types"

export function SupplierProductTable({
  products,
  supplierId,
  onQuickEdit,
  onDelete,
}: {
  products: MarketplaceProduct[]
  supplierId: string
  onQuickEdit: (id: string, patch: { price?: number; inStock?: boolean; isActive?: boolean }) => void
  onDelete: (id: string) => void
}) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  if (products.length === 0) {
    return (
      <p className="px-1 py-4 text-center text-xs text-ink-500">
        No products yet —{" "}
        <Link href={`/admin/marketplace/products/new?supplierId=${supplierId}`} className="font-semibold text-brand-700 underline">
          add one
        </Link>
        .
      </p>
    )
  }

  return (
    <>
      {/* sm and up: the quick-edit table */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[0.6875rem] uppercase tracking-wide text-ink-500">
              <th className="py-1.5 pr-2 font-medium">Product</th>
              <th className="py-1.5 pr-2 font-medium">Unit</th>
              <th className="py-1.5 pr-2 font-medium">Price</th>
              <th className="py-1.5 pr-2 font-medium">Variants</th>
              <th className="py-1.5 pr-2 font-medium">Status</th>
              <th className="py-1.5 pr-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {products.map((product) => (
              <tr key={product.id}>
                <td className="py-2 pr-2 font-medium text-ink-900">{product.name}</td>
                <td className="py-2 pr-2 text-ink-600">{product.unit}</td>
                <td className="py-2 pr-2">
                  <input
                    type="number"
                    min={0}
                    aria-label={`Price for ${product.name}`}
                    defaultValue={product.price || ""}
                    onBlur={(event) => {
                      const next = Number(event.target.value)
                      if (!Number.isNaN(next) && next !== product.price) onQuickEdit(product.id, { price: next })
                    }}
                    className="h-8 w-24 rounded-lg border border-border bg-white px-2 text-sm"
                  />
                </td>
                <td className="py-2 pr-2 text-ink-600">{(product.variants ?? []).length}</td>
                <td className="py-2 pr-2">
                  <select
                    aria-label={`Publish status for ${product.name}`}
                    value={product.isActive ? "published" : "draft"}
                    onChange={(event) => onQuickEdit(product.id, { isActive: event.target.value === "published" })}
                    className="h-8 rounded-lg border border-border bg-white px-2 text-xs"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </td>
                <td className="py-2 pr-2">
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      className="size-8"
                      aria-label={`Edit ${product.name}`}
                      render={<Link href={`/admin/marketplace/products/${product.id}`} />}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="size-8"
                      aria-label={`Duplicate ${product.name}`}
                      render={<Link href={`/admin/marketplace/products/new?supplierId=${supplierId}&cloneFrom=${product.id}`} />}
                    >
                      <Copy className="size-3.5" />
                    </Button>
                    <Button type="button" size="icon" variant="outline" className="size-8" aria-label={`Delete ${product.name}`} onClick={() => setPendingDeleteId(product.id)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phones: one card per product, with the price and publish status editable in place */}
      <ul className="space-y-2 sm:hidden">
        {products.map((product) => (
          <li key={product.id} data-card className="rounded-xl border border-border/70 bg-white p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink-900">{product.name}</p>
                <p className="mt-0.5 text-xs text-ink-500">
                  {product.unit}
                  {(product.variants ?? []).length > 0
                    ? ` · ${(product.variants ?? []).length} variant${(product.variants ?? []).length === 1 ? "" : "s"}`
                    : ""}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  size="icon"
                  variant="outline"
                  className="size-9"
                  aria-label={`Edit ${product.name}`}
                  render={<Link href={`/admin/marketplace/products/${product.id}`} />}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className="size-9"
                  aria-label={`Duplicate ${product.name}`}
                  render={<Link href={`/admin/marketplace/products/new?supplierId=${supplierId}&cloneFrom=${product.id}`} />}
                >
                  <Copy className="size-3.5" />
                </Button>
                <Button type="button" size="icon" variant="outline" className="size-9" aria-label={`Delete ${product.name}`} onClick={() => setPendingDeleteId(product.id)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="grid gap-1 text-[0.6875rem] font-medium text-ink-600">
                Price
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  aria-label={`Price for ${product.name}`}
                  defaultValue={product.price || ""}
                  onBlur={(event) => {
                    const next = Number(event.target.value)
                    if (!Number.isNaN(next) && next !== product.price) onQuickEdit(product.id, { price: next })
                  }}
                  className="rounded-lg border border-border bg-white px-2.5 text-sm font-normal text-ink-900"
                />
              </label>
              <label className="grid gap-1 text-[0.6875rem] font-medium text-ink-600">
                Status
                <select
                  aria-label={`Publish status for ${product.name}`}
                  value={product.isActive ? "published" : "draft"}
                  onChange={(event) => onQuickEdit(product.id, { isActive: event.target.value === "published" })}
                  className="rounded-lg border border-border bg-white px-2.5 text-sm font-normal text-ink-900"
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </label>
            </div>
          </li>
        ))}
      </ul>

      <Dialog open={pendingDeleteId != null} onOpenChange={(open) => !open && setPendingDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this product?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-ink-600">This removes the catalogue item permanently. This cannot be undone.</p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPendingDeleteId(null)}>Cancel</Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (pendingDeleteId) onDelete(pendingDeleteId)
                setPendingDeleteId(null)
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

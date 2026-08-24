"use client";

import {
  AlertCircle,
  CheckCircle2,
  Package,
  Pencil,
  Plus,
  RefreshCcw,
  Store,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  marketplaceService,
  type MarketplaceCategory,
  type SupplierWithProducts,
} from "@/services/marketplace.service";
import { formatPrice } from "@/utils/format-price";

export function SellerCataloguePanel({
  token,
  initialSuppliers,
  categories,
}: {
  token: string;
  initialSuppliers: SupplierWithProducts[];
  categories: MarketplaceCategory[];
}) {
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [selectedSupplierId, setSelectedSupplierId] = useState(
    initialSuppliers[0]?.id ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const selectedSupplier =
    suppliers.find((s) => s.id === selectedSupplierId) ?? suppliers[0];
  const products = selectedSupplier?.products ?? [];
  const categoryName = (slug: string) =>
    categories.find((c) => c.slug === slug)?.name ?? slug;

  async function refresh() {
    if (!token) return;
    try {
      const next = await marketplaceService.sellerListSuppliers(token);
      setSuppliers(next);
      // Purge Next's client Router Cache so the public marketplace pages
      // (force-dynamic) re-fetch fresh data on the next navigation in this session.
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not refresh.");
    }
  }

  async function deleteProduct(id: string) {
    if (!window.confirm("Remove this product from your catalogue?")) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await marketplaceService.sellerDeleteProduct(id, token);
      await refresh();
      setMessage("Product removed.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not delete product.",
      );
    } finally {
      setSaving(false);
    }
  }

  // No suppliers routed to this seller yet — nothing they can manage.
  if (suppliers.length === 0) {
    return (
      <div className="surface-card flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <Store className="size-6" />
        </span>
        <h2 className="font-heading text-lg font-semibold text-ink-900">
          No supplier profile assigned yet
        </h2>
        <p className="max-w-md text-sm text-ink-600">
          Your catalogue lives under a marketplace supplier profile. Ask an
          admin to create your supplier and set you as its owner — then you can
          add products and services here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Supplier switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-white p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-ink-600">Supplier:</span>
          {suppliers.map((supplier) => (
            <button
              key={supplier.id}
              type="button"
              onClick={() => {
                setSelectedSupplierId(supplier.id);
              }}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                supplier.id === selectedSupplier?.id
                  ? "bg-brand-600 text-white"
                  : "bg-ink-100 text-ink-700 hover:bg-ink-200",
              )}
            >
              {supplier.name}
              <span className="ml-1.5 opacity-70">
                {(supplier.products ?? []).length}
              </span>
            </button>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={refresh}
        >
          <RefreshCcw className="size-3.5" /> Refresh
        </Button>
      </div>

      {message ? (
        <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 className="size-4" /> {message}
        </p>
      ) : null}
      {error ? (
        <p className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="size-4" /> {error}
        </p>
      ) : null}

      {/* Existing products */}
      <section className="surface-card overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-border/70 px-5 py-4">
          <div>
            <h2 className="font-heading text-lg font-semibold text-ink-900">
              {selectedSupplier?.name} catalogue
            </h2>
            <p className="mt-0.5 text-xs text-ink-500">
              {products.length} listing{products.length === 1 ? "" : "s"}{" "}
              buyers can request a quote on
            </p>
          </div>
          <Link href={`/seller/marketplace-catalogue/products/new?supplierId=${selectedSupplier?.id ?? ""}`}>
            <Button type="button" size="sm">
              <Plus className="size-3.5" /> Add product
            </Button>
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
            <Package className="size-7 text-ink-300" />
            <p className="text-sm font-medium text-ink-700">
              No products yet
            </p>
            <p className="text-xs text-ink-500">
              Use the form to add your first product or service line.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/70">
            {products.map((product) => (
              <li key={product.id} className="flex items-center gap-3 p-4">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-border bg-ink-50">
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      sizes="56px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-ink-300">
                      <Package className="size-5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate text-sm font-semibold text-ink-900">
                      {product.name}
                    </p>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        product.inStock
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700",
                      )}
                    >
                      {product.inStock ? "In stock" : "On order"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {categoryName(product.categorySlug)} ·{" "}
                    {product.price > 0
                      ? formatPrice(product.price, true)
                      : "Quote"}{" "}
                    / {product.unit}
                    {(product.variants?.length ?? 0) > 0
                      ? ` · ${product.variants?.length} variant${product.variants?.length === 1 ? "" : "s"}`
                      : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Link href={`/seller/marketplace-catalogue/products/${product.id}`}>
                    <Button type="button" size="sm" variant="outline" aria-label={`Edit ${product.name}`}>
                      <Pencil className="size-3.5" />
                    </Button>
                  </Link>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="size-9 text-destructive hover:bg-destructive/10"
                    aria-label={`Delete ${product.name}`}
                    disabled={saving}
                    onClick={() => deleteProduct(product.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

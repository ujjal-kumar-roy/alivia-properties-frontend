export const dynamic = "force-dynamic"

import { notFound } from "next/navigation"
import { auth } from "@/auth"
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header"
import { marketplaceService } from "@/services/marketplace.service"
import { SellerProductEditorHost } from "@/pages-sections/seller/seller-product-editor-host"

export default async function SellerEditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const token = session?.accessToken ?? ""

  const [suppliers, categories] = await Promise.all([
    marketplaceService.sellerListSuppliers(token).catch(() => []),
    marketplaceService.adminListCategories(token).catch(() => marketplaceService.listCategories().catch(() => [])),
  ])
  const product = suppliers.flatMap((s) => s.products ?? []).find((p) => p.id === id)
  if (!product) notFound()

  return (
    <div className="space-y-6">
      <DashboardPageHeader title="Edit product" description={product.name} />
      <SellerProductEditorHost token={token} mode="edit" categories={categories} suppliers={suppliers} product={product} />
    </div>
  )
}

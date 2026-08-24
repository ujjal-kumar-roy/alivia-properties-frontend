export const dynamic = "force-dynamic"

import { auth } from "@/auth"
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header"
import { marketplaceService } from "@/services/marketplace.service"
import { SellerProductEditorHost } from "@/pages-sections/seller/seller-product-editor-host"

export default async function SellerNewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ supplierId?: string }>
}) {
  const { supplierId } = await searchParams
  const session = await auth()
  const token = session?.accessToken ?? ""

  const [suppliers, categories] = await Promise.all([
    marketplaceService.sellerListSuppliers(token).catch(() => []),
    marketplaceService.adminListCategories(token).catch(() => marketplaceService.listCategories().catch(() => [])),
  ])

  return (
    <div className="space-y-6">
      <DashboardPageHeader title="Add product" description="Add a product to your catalogue." />
      <SellerProductEditorHost token={token} mode="create" categories={categories} suppliers={suppliers} defaultSupplierId={supplierId} />
    </div>
  )
}

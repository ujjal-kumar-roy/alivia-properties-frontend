export const dynamic = "force-dynamic"

import { notFound } from "next/navigation"
import { auth } from "@/auth"
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header"
import { marketplaceService } from "@/services/marketplace.service"
import { AdminProductEditorHost } from "@/pages-sections/admin/marketplace-catalogue/admin-product-editor-host"

export default async function AdminEditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const token = session?.accessToken ?? ""

  const [categories, suppliersRes, productsRes] = await Promise.all([
    marketplaceService.adminListCategories(token).catch(() => []),
    marketplaceService.adminListSuppliers({ limit: 100 }, token).then((r) => r.data).catch(() => []),
    marketplaceService.adminListProducts({ limit: 100 }, token).then((r) => r.data).catch(() => []),
  ])
  const product = productsRes.find((p) => p.id === id)
  if (!product) notFound()

  return (
    <div className="space-y-6">
      <DashboardPageHeader title="Edit product" description={product.name} />
      <AdminProductEditorHost token={token} mode="edit" categories={categories} suppliers={suppliersRes} product={product} />
    </div>
  )
}

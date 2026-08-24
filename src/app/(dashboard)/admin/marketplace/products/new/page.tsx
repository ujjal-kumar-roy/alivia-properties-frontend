export const dynamic = "force-dynamic"

import { auth } from "@/auth"
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header"
import { marketplaceService } from "@/services/marketplace.service"
import { AdminProductEditorHost } from "@/pages-sections/admin/marketplace-catalogue/admin-product-editor-host"

export default async function AdminNewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ supplierId?: string; categorySlug?: string; cloneFrom?: string }>
}) {
  const { supplierId, categorySlug, cloneFrom } = await searchParams
  const session = await auth()
  const token = session?.accessToken ?? ""

  const [categories, suppliersRes, cloneProduct] = await Promise.all([
    marketplaceService.adminListCategories(token).catch(() => []),
    marketplaceService.adminListSuppliers({ limit: 100 }, token).then((r) => r.data).catch(() => []),
    cloneFrom
      ? marketplaceService.adminListProducts({ limit: 100 }, token).then((r) => r.data.find((p) => p.id === cloneFrom))
      : Promise.resolve(undefined),
  ])

  return (
    <div className="space-y-6">
      <DashboardPageHeader title="Add product" description="Create a catalogue item under a supplier." />
      <AdminProductEditorHost
        token={token}
        mode="create"
        categories={categories}
        suppliers={suppliersRes}
        defaultSupplierId={supplierId}
        defaultCategorySlug={categorySlug}
        cloneProduct={cloneProduct}
      />
    </div>
  )
}

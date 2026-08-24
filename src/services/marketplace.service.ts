import { httpClient, type Paginated } from "./http-client"
import type {
  CategoryAttribute,
  CategoryImage,
  CategoryLevel,
  CategoryVariant,
  MarketplaceProduct,
  ProductDocument,
  ProductPriceTier,
  ProductVariant,
  Supplier,
} from "@/types/marketplace.types"

export type MarketplaceCategory = {
  id: string
  slug: string
  name: string
  description?: string | null
  level?: CategoryLevel
  iconUrl?: string | null
  image?: CategoryImage | null
  parentSlug?: string | null
  order: number
  isActive?: boolean
  /** Live count of products attached to this category (from listCategories). */
  productCount?: number
  variants?: CategoryVariant[]
  attributes?: CategoryAttribute[]
}

/** A category is the leaf node — it carries the image + RFQ config and suppliers. */
export type TreeCategory = MarketplaceCategory
export type TreeDepartment = MarketplaceCategory & { categories: TreeCategory[] }

export type SupplierWithProducts = Supplier & { products: MarketplaceProduct[] }

export type ProductWithSupplier = MarketplaceProduct & {
  supplier?: {
    id: string
    slug: string
    name: string
    phone?: string
    email?: string
    kind?: Supplier["kind"]
  }
  category?: MarketplaceCategory
}

type ListParams = {
  page?: number
  limit?: number
  search?: string
  sort?: string
  category?: string
  supplierId?: string
  kind?: "SUPPLIER" | "SERVICE"
  isActive?: boolean
}

export type CategoryVariantInput = {
  id?: string
  name: string
  description?: string
  unit?: string
  order?: number
  isActive?: boolean
}

export type CategoryAttributeInput = {
  id?: string
  key?: string
  label: string
  type?: "TEXT" | "NUMBER" | "SELECT"
  options?: string[]
  unit?: string
  required?: boolean
  order?: number
}

export type CreateCategoryInput = {
  slug: string
  name: string
  level?: CategoryLevel
  description?: string
  iconUrl?: string
  image?: CategoryImage | null
  parentSlug?: string
  order?: number
  isActive?: boolean
  variants?: CategoryVariantInput[]
  attributes?: CategoryAttributeInput[]
}

export type UpdateCategoryInput = Partial<Omit<CreateCategoryInput, "description" | "iconUrl" | "parentSlug">> & {
  description?: string | null
  iconUrl?: string | null
  parentSlug?: string | null
}

export type CreateSupplierInput = {
  slug?: string
  name: string
  kind?: "SUPPLIER" | "SERVICE"
  tagline?: string
  logo?: string
  coverImage?: string
  location: string
  serviceAreas?: string[]
  phone: string
  whatsApp?: string
  email?: string
  categories?: string[]
  brands?: string[]
  certifications?: string[]
  rating?: number
  reviewCount?: number
  yearsInBusiness?: number
  responseTimeHours?: number
  deliveryDays?: number
  priceRange?: string
  gallery?: string[]
  videoUrl?: string
  inStock?: boolean
  itemsSold?: number
  isVerified?: boolean
  isFeatured?: boolean
  ownerId?: string
}

export type UpdateSupplierInput = Partial<CreateSupplierInput>

export type CreateProductInput = {
  slug?: string
  name: string
  supplierId: string
  categorySlug: string
  image?: string
  price?: number
  unit?: string
  description?: string
  shortDescription?: string
  inStock?: boolean
  moq?: number
  leadTimeDays?: number
  brand?: string
  badge?: string
  variants?: Partial<ProductVariant>[]
  gallery?: string[]
  videoUrl?: string
  documents?: ProductDocument[]
  specs?: { key?: string; label: string; value: string; unit?: string }[]
  highlights?: string[]
  sku?: string
  warranty?: string
  origin?: string
  packaging?: string
  certifications?: string[]
  priceTiers?: ProductPriceTier[]
  isActive?: boolean
  isFeatured?: boolean
  order?: number
}

export type UpdateProductInput = Partial<CreateProductInput>

export const marketplaceService = {
  listCategories(): Promise<MarketplaceCategory[]> {
    return httpClient.get<MarketplaceCategory[]>("/marketplace/categories")
  },

  /** Full Department → Category tree (powers the quote wizard). */
  getTree(): Promise<TreeDepartment[]> {
    return httpClient.get<TreeDepartment[]>("/marketplace/tree")
  },

  listDepartments(): Promise<MarketplaceCategory[]> {
    return httpClient.get<MarketplaceCategory[]>("/marketplace/departments")
  },

  listCategoriesUnder(department: string): Promise<MarketplaceCategory[]> {
    return httpClient.get<MarketplaceCategory[]>("/marketplace/categories", {
      query: { department },
    })
  },

  // ─── Admin methods ────────────────────────────────────────────────────────

  adminListCategories(token: string): Promise<MarketplaceCategory[]> {
    return httpClient.get<MarketplaceCategory[]>("/marketplace/admin/categories", { token })
  },

  adminCreateCategory(data: CreateCategoryInput, token: string): Promise<MarketplaceCategory> {
    return httpClient.post<MarketplaceCategory>("/marketplace/admin/categories", data, { token })
  },

  adminUpdateCategory(slug: string, data: UpdateCategoryInput, token: string): Promise<MarketplaceCategory> {
    return httpClient.patch<MarketplaceCategory>(`/marketplace/admin/categories/${slug}`, data, { token })
  },

  adminDeleteCategory(slug: string, token: string): Promise<MarketplaceCategory> {
    return httpClient.delete<MarketplaceCategory>(`/marketplace/admin/categories/${slug}`, { token })
  },

  adminReorderCategories(slugs: string[], token: string): Promise<{ reordered: number }> {
    return httpClient.put<{ reordered: number }>("/marketplace/admin/categories/reorder", { slugs }, { token })
  },

  adminListSuppliers(params: ListParams = {}, token: string): Promise<Paginated<Supplier>> {
    return httpClient.paginated<Supplier>("/marketplace/admin/suppliers", {
      query: params as Record<string, string | number | boolean | undefined>,
      token,
    })
  },

  adminCreateSupplier(data: CreateSupplierInput, token: string): Promise<Supplier> {
    return httpClient.post<Supplier>("/marketplace/admin/suppliers", data, { token })
  },

  adminUpdateSupplier(id: string, data: UpdateSupplierInput, token: string): Promise<Supplier> {
    return httpClient.patch<Supplier>(`/marketplace/admin/suppliers/${id}`, data, { token })
  },

  adminDeleteSupplier(id: string, token: string): Promise<Supplier> {
    return httpClient.delete<Supplier>(`/marketplace/admin/suppliers/${id}`, { token })
  },

  adminListProducts(params: ListParams = {}, token: string): Promise<Paginated<ProductWithSupplier>> {
    return httpClient.paginated<ProductWithSupplier>("/marketplace/admin/products", {
      query: params as Record<string, string | number | boolean | undefined>,
      token,
    })
  },

  adminCreateProduct(data: CreateProductInput, token: string): Promise<ProductWithSupplier> {
    return httpClient.post<ProductWithSupplier>("/marketplace/admin/products", data, { token })
  },

  adminUpdateProduct(id: string, data: UpdateProductInput, token: string): Promise<ProductWithSupplier> {
    return httpClient.patch<ProductWithSupplier>(`/marketplace/admin/products/${id}`, data, { token })
  },

  adminDeleteProduct(id: string, token: string): Promise<ProductWithSupplier> {
    return httpClient.delete<ProductWithSupplier>(`/marketplace/admin/products/${id}`, { token })
  },

  // ─── Seller methods (manage the catalogue of suppliers you own) ─────────────

  /** Suppliers owned by the signed-in seller, each with its products. */
  sellerListSuppliers(token: string): Promise<SupplierWithProducts[]> {
    return httpClient.get<SupplierWithProducts[]>("/marketplace/seller/suppliers", { token })
  },

  sellerListProducts(params: ListParams = {}, token: string): Promise<Paginated<ProductWithSupplier>> {
    return httpClient.paginated<ProductWithSupplier>("/marketplace/seller/products", {
      query: params as Record<string, string | number | boolean | undefined>,
      token,
    })
  },

  sellerCreateProduct(data: CreateProductInput, token: string): Promise<ProductWithSupplier> {
    return httpClient.post<ProductWithSupplier>("/marketplace/seller/products", data, { token })
  },

  sellerUpdateProduct(id: string, data: UpdateProductInput, token: string): Promise<ProductWithSupplier> {
    return httpClient.patch<ProductWithSupplier>(`/marketplace/seller/products/${id}`, data, { token })
  },

  sellerDeleteProduct(id: string, token: string): Promise<ProductWithSupplier> {
    return httpClient.delete<ProductWithSupplier>(`/marketplace/seller/products/${id}`, { token })
  },

  listProducts(params: ListParams = {}): Promise<Paginated<ProductWithSupplier>> {
    return httpClient.paginated<ProductWithSupplier>("/marketplace/products", {
      query: params as Record<string, string | number | boolean | undefined>,
    })
  },

  productBySlug(slug: string): Promise<ProductWithSupplier> {
    return httpClient.get<ProductWithSupplier>(`/marketplace/products/${slug}`)
  },

  listSuppliers(params: ListParams = {}): Promise<Paginated<Supplier>> {
    return httpClient.paginated<Supplier>("/marketplace/suppliers", {
      query: params as Record<string, string | number | boolean | undefined>,
    })
  },

  supplierBySlug(slug: string): Promise<SupplierWithProducts> {
    return httpClient.get<SupplierWithProducts>(`/marketplace/suppliers/${slug}`)
  },
}
